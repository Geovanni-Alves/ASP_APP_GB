package com.asp.api.maintenance;

import com.asp.api.files.FileStorage;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * The photos and videos of the news do not stay on the server forever: after some days they are deleted (the
 * families can save the ones they want, from the app). The text, the time and who posted it STAY: only the
 * pictures go, and the item is marked "media_expired" so the apps can say it.
 *
 * Settings (table "settings"):
 *   media_retention_days            default 60   (photos, videos, activities, promotions)
 *   incident_media_retention_days   default 365  (the pictures of an incident are kept longer)
 *
 * It runs every night at 3:30 (the time of the program). The profile photos are NOT touched.
 */
@Component
public class MediaRetentionJob {

    private static final Logger log = LoggerFactory.getLogger(MediaRetentionJob.class);
    private static final int PAGE = 200;

    private final JdbcTemplate jdbc;
    private final FileStorage storage;
    private final String timezone;
    private final ObjectMapper mapper = new ObjectMapper();

    public MediaRetentionJob(JdbcTemplate jdbc, FileStorage storage,
                             @Value("${app.timezone:America/Vancouver}") String timezone) {
        this.jdbc = jdbc;
        this.storage = storage;
        this.timezone = timezone;
    }

    @Scheduled(cron = "0 30 3 * * *", zone = "${app.timezone:America/Vancouver}")
    public void nightly() {
        try {
            log.info("Media retention finished: {}", expire());
        } catch (Exception e) {
            log.warn("Media retention failed: {}", e.getMessage());
        }
    }

    /** Deletes the pictures and videos that passed the limit. Returns what it did. */
    public Map<String, Object> expire() {
        int days = settingDays("media_retention_days", 60);
        int incidentDays = settingDays("incident_media_retention_days", 365);
        int items = 0;
        int files = 0;

        while (true) {
            List<Map<String, Object>> rows = jdbc.queryForList("""
                select id, "mediaName" as one, "mediaNames"::text as many
                from "kidFeeds"
                where not media_expired
                  and (coalesce("mediaName", '') <> '' or coalesce("mediaNames", '[]'::jsonb) <> '[]'::jsonb)
                  and "dateTime" < (now() at time zone CAST(? AS text))
                                   - make_interval(days => case when type::text = 'INCIDENT'
                                                                then CAST(? AS int) else CAST(? AS int) end)
                order by id
                limit
                """ + PAGE, timezone, incidentDays, days);
            if (rows.isEmpty()) {
                break;
            }

            for (Map<String, Object> row : rows) {
                Set<String> names = new LinkedHashSet<>();
                if (row.get("one") != null && !row.get("one").toString().isBlank()) {
                    names.add(row.get("one").toString());
                }
                try {
                    if (row.get("many") != null) {
                        JsonNode list = mapper.readTree(row.get("many").toString());
                        for (JsonNode node : list) {
                            names.add(node.asText());
                        }
                    }
                } catch (IOException e) {
                    // an unreadable list: only the first one is deleted
                }

                for (String name : names) {
                    String bucket = name.toLowerCase().matches(".*[.](mp4|mov|m4v)$") ? "feedVideos" : "feedPhotos";
                    try {
                        if (storage.delete(bucket, name)) {
                            files++;
                        }
                    } catch (IOException e) {
                        log.warn("Could not delete {}/{}: {}", bucket, name, e.getMessage());
                    }
                }

                jdbc.update("update \"kidFeeds\" set \"mediaName\" = null, \"mediaNames\" = '[]'::jsonb, "
                    + "media_expired = true where id = ?", row.get("id"));
                items++;
            }
            if (rows.size() < PAGE) {
                break;
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("items", items);
        result.put("files", files);
        result.put("days", days);
        result.put("incidentDays", incidentDays);
        return result;
    }

    private int settingDays(String key, int fallback) {
        try {
            List<String> values = jdbc.queryForList(
                "select value from settings where key = ? limit 1", String.class, key);
            if (!values.isEmpty() && values.get(0) != null) {
                int days = Integer.parseInt(values.get(0).trim());
                if (days >= 1 && days <= 3650) {
                    return days;
                }
            }
        } catch (Exception e) {
            // no setting: the default
        }
        return fallback;
    }
}
