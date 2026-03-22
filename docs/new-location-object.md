# API Database - Property collection updates
### Description
When creating a new property, a new field should be accepted, address.  Address should be the street, city, state, zip code of the property.  The [geocoder](https://github.com/nchaulet/node-geocoder) method will be called and respond with a location object with latitude, longitude, country, countryCode, city, zipcode, streetName, streetNumber, and formatted address.  [geocoder](https://github.com/nchaulet/node-geocoder) will need GEOCODER_PROVIDER and GEOCODER_API_KEY, which are located in the .env file.  Add new field "beds" which should be a number.

### Success Criteria
- [x] add [geocoder](https://github.com/nchaulet/node-geocoder) to the project
- [x] make use of GEOCODER_PROVIDER and GEOCODER_API_KEY in [.env](../.env)
- [x] add the address field and the location object to the properties model
- [x] address field should be required when creating a new property.
- [x] use the address field and [geocoder](https://github.com/nchaulet/node-geocoder) function as a pre-save funtion to populate the location object with these fields:
    - cooridnates
        - latitude
        - longitude
    - country
    - city
    - zipcode
    - streetName
    - streetNumber
    - stateCode
    - formattedAddress
- [x] once location has been created for a new property, remove address from with `this.address = undefined`.  The address field is only used to generate the location object and does not persist.  Do not store the address in the database.
- [x] add the address field to the create and update property front end pages
- [x] add "beds" to the Property.js model as a number.
- [x] add "guests" to the Property.js model as a number.  This is Max occupancy and required on create.  The admin should be able to add this on Edit Property page.
- [x] for existing properties, addresses will be added by admin by editing the property, so be sure the address field is on the Property Edit page.
- [x] update Property.js model enum and /homes/[slug] to aligne with [Finger Lake](finger-lake.md)

### EXAMPLE API request from developers.google.com
`curl 'https://maps.googleapis.com/maps/api/geocode/json?address=1600+Amphitheatre+Parkway,+Mountain+View,+CA&key=YOUR_API_KEY'`

**Google Cloud setup (billing, APIs, key restrictions):** [google-maps-geocoding-setup.md](google-maps-geocoding-setup.md)
