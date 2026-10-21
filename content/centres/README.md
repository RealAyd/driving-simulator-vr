# Driving test centres (search list for "Drive anywhere")

`test-centres.json`: one entry per practical car test centre.

- **Names, pass rates and number of tests:** DVSA DRT122A, car driving test pass rates by test centre, April 2024
  to March 2025 (gov.uk, Open Government Licence v3.0). Centres not in that table (Northern Ireland's DVA centres
  and a few others) have no pass rate.
- **Postcodes:** a list supplied by the project owner (October 2026), from drivingtestcentres.co.uk and, for
  Northern Ireland, nidirect.gov.uk.
- **Positions:** each postcode looked up with postcodes.io (Ordnance Survey and ONS open data); two retired
  postcodes from postcodes.io's terminated-postcode records. Where no postcode was supplied, the centre found with
  OpenStreetMap's search (Nominatim, ODbL) or, failing that, its town (`located: "town"`, shown as approximate).
