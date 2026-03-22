# Vue Component - VacaRentSumCard.vue
### Description
This is a component that will be used in multiple locations and pages of flxvacations.com.  The component should be a card that displays the property's main image, the title of the property as an H3 (EXAMPLE: <h3>Himrod House</h3>), the city and state (EXAMPLE: "Geneva, NY"), the number of beds and bedrooms (EXAMPLE: 6 beds - 4 bedrooms).  The card should be a link to that Property Profile Page.

### Component Elements
- [x] Image - the top of the card has the property’s main image. **Aspect ratio 3:2** (horizontal long edge). The top two corners are rounded; the bottom two corners are square (flush with the text block).
- [x] Title - displays property title as **H3**, bold, black, **`text-md`** (see `tailwind.config.ts` in flxvacations.com — ~15px at 16px root), slightly larger than beds/city lines.
- [x] Beds / bedrooms - the card displays **beds** and **bedrooms** in gray. Example: `6 beds - 4 bedrooms`. Uses `beds` and `bedrooms` from the Properties collection.
- [x] City, ST - Uses `location.city` and `location.stateCode` below the beds/bedrooms line. Example `Penn Yan, NY`.
- [x] If missing data, hide lines.

### VacaRentSumCard.vue card design
- [x] Tailwind stacked card: image on top; below: Title, beds/bedrooms, City, ST.
- [x] Corners of the card slightly rounded (`rounded-xl`).
- [x] Image area **3:2** aspect ratio (`aspect-[3/2]`).
