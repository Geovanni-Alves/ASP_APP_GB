package com.asp.api.appdata;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * A feed item can carry SEVERAL photos ("stacked"): "mediaNames" is the list of file names, in order.
 * "mediaName" keeps the first one, so every screen that only knows one photo keeps working.
 * Like the other schema runners, this stands in for proper migrations (Flyway), planned for later.
 */
@Component
@Order(0)
public class FeedSchema implements ApplicationRunner {

    private final JdbcTemplate jdbc;

    public FeedSchema(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        jdbc.execute("alter table \"kidFeeds\" add column if not exists \"mediaNames\" jsonb");

        // The pictures and videos are deleted after some days (see MediaRetentionJob): the item stays, marked
        jdbc.execute("alter table \"kidFeeds\" add column if not exists media_expired boolean not null default false");

        // The items made before have one photo: the list has that one
        jdbc.update("update \"kidFeeds\" set \"mediaNames\" = jsonb_build_array(\"mediaName\") "
            + "where \"mediaNames\" is null and \"mediaName\" is not null and \"mediaName\" <> ''");
    }
}
