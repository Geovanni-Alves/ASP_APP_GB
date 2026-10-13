package com.asp.api.geocode;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriBuilder;

/**
 * Address search ("autocomplete"). Talks to a Photon geocoder (open source, built on OpenStreetMap).
 * The dashboard never calls the geocoder directly: it calls our API, so the provider can be
 * swapped (public server today, your own server later) without touching the apps.
 *
 * What this class adds on top of a plain Photon search:
 *  1. "10th" and "tenth" are both tried (the map data spells some streets with digits, others with words).
 *  2. A second search limited to the area around the preferred point (app.geocoder.bias-lat/lon), so a
 *     local address is not drowned by the same street name in other cities of the world.
 *  3. Our own ranking: a result whose street number matches what was typed comes first, then results
 *     near the preferred point. Ties keep Photon's relevance order.
 */
@Service
public class GeocodingService {

    private static final int FETCH_LIMIT = 10; // ask Photon for more than we return, so we can re-rank
    private static final Pattern LEADING_NUMBER = Pattern.compile("^\\s*(\\d+[a-zA-Z]?)\\b");

    // "10th" <-> "tenth" (first to twentieth)
    private static final Map<String, String> ORDINAL_TO_WORD = new HashMap<>();
    private static final Map<String, String> WORD_TO_ORDINAL = new HashMap<>();

    static {
        String[] words = {
            "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth",
            "eleventh", "twelfth", "thirteenth", "fourteenth", "fifteenth", "sixteenth", "seventeenth",
            "eighteenth", "nineteenth", "twentieth"
        };
        for (int i = 0; i < words.length; i++) {
            int n = i + 1;
            String suffix = "th";
            if (n < 11 || n > 13) {
                if (n % 10 == 1) {
                    suffix = "st";
                } else if (n % 10 == 2) {
                    suffix = "nd";
                } else if (n % 10 == 3) {
                    suffix = "rd";
                }
            }
            ORDINAL_TO_WORD.put(n + suffix, words[i]);
            WORD_TO_ORDINAL.put(words[i], n + suffix);
        }
    }

    private final RestClient client;
    private final String bbox;      // explicit restriction (empty = none)
    private final Double centerLat; // preferred point (null = no preference)
    private final Double centerLon;
    private final double radiusKm;  // what "near" means
    private final String localBbox; // search area around the preferred point

    public GeocodingService(@Value("${app.geocoder.url}") String baseUrl,
                            @Value("${app.geocoder.bbox:}") String bbox,
                            @Value("${app.geocoder.bias-lat:}") String biasLat,
                            @Value("${app.geocoder.bias-lon:}") String biasLon,
                            @Value("${app.geocoder.bias-radius-km:100}") double radiusKm) {
        this.client = RestClient.builder()
            .baseUrl(baseUrl)
            .defaultHeader(HttpHeaders.USER_AGENT, "asp-api (address autocomplete)")
            .build();
        this.bbox = bbox;
        this.centerLat = parseOrNull(biasLat);
        this.centerLon = parseOrNull(biasLon);
        this.radiusKm = radiusKm;
        this.localBbox = (centerLat != null && centerLon != null)
            ? buildLocalBbox(centerLat, centerLon, radiusKm)
            : "";
    }

    public List<Map<String, Object>> search(String query, int limit) {
        List<String> texts = new ArrayList<>();
        texts.add(query);
        String toggled = toggleOrdinals(query);
        if (!toggled.equals(query)) {
            texts.add(toggled);
        }

        // label (lower case) -> result; keeps the first occurrence and the order of arrival
        Map<String, Map<String, Object>> merged = new LinkedHashMap<>();

        if (!bbox.isBlank() || localBbox.isEmpty()) {
            // An explicit restriction was configured, or there is no preferred point: plain search
            for (String text : texts) {
                addAll(merged, fetch(text, bbox));
            }
        } else {
            // Look around the preferred point first, then everywhere
            for (String text : texts) {
                addAll(merged, fetch(text, localBbox));
            }
            addAll(merged, fetch(query, ""));
        }

        String houseNumber = leadingNumber(query);
        List<Map<String, Object>> results = new ArrayList<>(merged.values());
        // The sort is stable: results with the same score keep their relevance order
        results.sort(Comparator.comparingInt((Map<String, Object> r) -> score(r, houseNumber)).reversed());

        return results.size() > limit ? new ArrayList<>(results.subList(0, limit)) : results;
    }

    // ------------------------------------------------------------- Photon call

    private List<Map<String, Object>> fetch(String text, String bboxValue) {
        JsonNode root;
        try {
            root = client.get()
                .uri(uri -> {
                    UriBuilder builder = uri.path("/api/")
                        .queryParam("q", "{q}") // a template variable, so the text is safely encoded
                        .queryParam("limit", FETCH_LIMIT)
                        .queryParam("lang", "en");
                    if (!bboxValue.isBlank()) {
                        builder.queryParam("bbox", bboxValue);
                    }
                    return builder.build(Map.of("q", text));
                })
                .retrieve()
                .body(JsonNode.class);
        } catch (RestClientException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Address search is unavailable");
        }
        return parse(root);
    }

    private List<Map<String, Object>> parse(JsonNode root) {
        List<Map<String, Object>> results = new ArrayList<>();
        if (root == null) {
            return results;
        }
        for (JsonNode feature : root.path("features")) {
            JsonNode props = feature.path("properties");
            JsonNode coords = feature.path("geometry").path("coordinates"); // [longitude, latitude]
            if (!coords.isArray() || coords.size() < 2) {
                continue;
            }

            String name = text(props, "name");
            String houseNumber = text(props, "housenumber");
            String street = text(props, "street");
            String streetLine = street.isEmpty() ? "" : (houseNumber.isEmpty() ? street : houseNumber + " " + street);
            String line1 = streetLine.isEmpty() ? name : streetLine;

            String city = text(props, "city");
            if (city.isEmpty()) {
                city = text(props, "locality");
            }
            if (city.isEmpty()) {
                city = text(props, "district");
            }
            String province = text(props, "state");
            String postalCode = text(props, "postcode");
            String country = text(props, "country");

            // Human readable line: [place name,] street, city, province, postal code, country
            List<String> parts = new ArrayList<>();
            if (!name.isEmpty() && !name.equals(line1)) {
                parts.add(name);
            }
            for (String part : List.of(line1, city, province, postalCode, country)) {
                if (!part.isEmpty()) {
                    parts.add(part);
                }
            }

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("label", String.join(", ", parts));
            result.put("line1", line1);
            result.put("city", city);
            result.put("province", province);
            result.put("postalCode", postalCode);
            result.put("country", country);
            result.put("lat", coords.get(1).asDouble());
            result.put("lng", coords.get(0).asDouble());
            results.add(result);
        }
        return results;
    }

    private static void addAll(Map<String, Map<String, Object>> merged, List<Map<String, Object>> results) {
        for (Map<String, Object> result : results) {
            merged.putIfAbsent(String.valueOf(result.get("label")).toLowerCase(), result);
        }
    }

    // ------------------------------------------------------------- ranking

    // +2 when the street number typed by the user matches, +1 when the result is near the preferred point
    private int score(Map<String, Object> result, String houseNumber) {
        int score = 0;
        String line1 = String.valueOf(result.get("line1")).toLowerCase();
        if (!houseNumber.isEmpty() && (line1.equals(houseNumber) || line1.startsWith(houseNumber + " "))) {
            score += 2;
        }
        if (isNear((Double) result.get("lat"), (Double) result.get("lng"))) {
            score += 1;
        }
        return score;
    }

    private boolean isNear(double lat, double lon) {
        return centerLat != null && centerLon != null
            && distanceKm(centerLat, centerLon, lat, lon) <= radiusKm;
    }

    // Great-circle distance in kilometres (haversine formula)
    private static double distanceKm(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
            * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 6371.0 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // ------------------------------------------------------------- text helpers

    // The street number typed at the start of the query ("1522 10th ave" -> "1522"), or ""
    private static String leadingNumber(String query) {
        Matcher matcher = LEADING_NUMBER.matcher(query);
        return matcher.find() ? matcher.group(1).toLowerCase() : "";
    }

    // Swaps "10th" for "tenth" and the other way round. Returns the same text when nothing changed.
    static String toggleOrdinals(String query) {
        String[] tokens = query.trim().split("\\s+");
        boolean changed = false;
        for (int i = 0; i < tokens.length; i++) {
            String token = tokens[i].toLowerCase();
            if (ORDINAL_TO_WORD.containsKey(token)) {
                tokens[i] = ORDINAL_TO_WORD.get(token);
                changed = true;
            } else if (WORD_TO_ORDINAL.containsKey(token)) {
                tokens[i] = WORD_TO_ORDINAL.get(token);
                changed = true;
            }
        }
        return changed ? String.join(" ", tokens) : query;
    }

    // minLon,minLat,maxLon,maxLat of a square around the point (roughly radiusKm in each direction)
    private static String buildLocalBbox(double lat, double lon, double radiusKm) {
        double dLat = radiusKm / 111.0;
        double dLon = radiusKm / (111.0 * Math.cos(Math.toRadians(lat)));
        return (lon - dLon) + "," + (lat - dLat) + "," + (lon + dLon) + "," + (lat + dLat);
    }

    private static Double parseOrNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Double.valueOf(value.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static String text(JsonNode node, String field) {
        return node.path(field).asText("");
    }
}
