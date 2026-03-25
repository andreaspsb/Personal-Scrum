package com.personalscrum.infrastructure.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;
import java.net.URI;
import java.net.URISyntaxException;

@Configuration
public class DatabaseConfig {

    @Value("${DATABASE_URL:}")
    private String databaseUrl;

    @Bean
    public DataSource dataSource() throws URISyntaxException {
        HikariConfig config = new HikariConfig();
        
        if (databaseUrl == null || databaseUrl.trim().isEmpty() || !databaseUrl.contains("://")) {
            config.setJdbcUrl("jdbc:postgresql://localhost:5432/personalscrum");
            config.setUsername("postgres");
            config.setPassword("postgres");
        } else {
            URI dbUri = new URI(databaseUrl);
            String username = dbUri.getUserInfo().split(":")[0];
            String password = dbUri.getUserInfo().split(":")[1];
            String dbUrl = "jdbc:postgresql://" + dbUri.getHost() + ':' + dbUri.getPort() + dbUri.getPath();

            config.setJdbcUrl(dbUrl);
            config.setUsername(username);
            config.setPassword(password);
        }
        
        config.setDriverClassName("org.postgresql.Driver");
        return new HikariDataSource(config);
    }
}
