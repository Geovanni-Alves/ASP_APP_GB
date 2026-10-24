package com.asp.api.maintenance;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Turns on the jobs that run by themselves at a time of the day (@Scheduled). */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
