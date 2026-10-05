"""External data ingestion: real AQI (WAQI) and temperature (Open-Meteo) for Delhi.

These sources are coarse (station/grid scale), so values are spread to H3 cells by
inverse-distance weighting. Noise + BLE density are not available from public APIs and
require deployed ESP32 sensors (Phase 5)."""
