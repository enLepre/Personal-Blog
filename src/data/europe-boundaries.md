# Europe boundary geometry

`europe-boundaries.json` contains longitude/latitude paths decoded from the
Natural Earth 1:110m geometry distributed by world-atlas 2.0.2
(`https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json`).
Natural Earth data is public domain. Shared TopoJSON arcs are stored once;
coordinates are rounded to four decimals and limited to 30°W–50°E, 25°N–78°N.
The homepage projects these coordinates with the Mercator formula and fades
the viewport edges. It makes no third-party runtime map requests.
