package com.asp.api.geocode;

import com.asp.api.auth.Roles;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/geocode")
public class GeocodeController {

    private final GeocodingService geocoding;

    public GeocodeController(GeocodingService geocoding) {
        this.geocoding = geocoding;
    }

    // GET /geocode/autocomplete?q=453 West 12th Avenue&limit=5
    // Returns a list of { label, line1, city, province, postalCode, country, lat, lng }.
    @GetMapping("/autocomplete")
    public List<Map<String, Object>> autocomplete(@RequestParam String q,
                                                  @RequestParam(defaultValue = "5") int limit,
                                                  Authentication auth) {
        Roles.requireManager(auth);
        String query = q.trim();
        if (query.length() < 3) {
            return List.of(); // too short to be worth a search
        }
        return geocoding.search(query, Math.min(Math.max(limit, 1), 10));
    }
}
