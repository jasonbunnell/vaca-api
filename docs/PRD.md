# Product Requirements Document (PRD)
# FLX Vacations API

**Version:** 0.1 (Draft)  
**Last updated:** [Feb 12, 2026]  
**Owner:** [Jason]  
**Status:** Scaffolding — to be filled collaboratively

---

## 1. Executive Summary

We are building the API for FLX Vacations.  FLX Vacations is a site similar to AirBNB.  The site allows short term property owners in the Finger Lakes region of New York list their properties to rent to vacationers in the Finger Lakes region of New York.  Similar to AirBNB, vacationers can browse properties on a map, by criteria, by features, by price, etc.  Each property should have a unique listing.  The listing should include a property title, number of bedrooms, number of bathrooms, description, amenities, features, etc.  There should be a collection of properties, a collection of users.  Each property should be associated with a user that is of type host.

**[To complete]**

- **What:** 
- **For whom: hosts and vacationers** 
- **Primary outcome: an API for flxvacations.com** 
- **Key dates / milestones (if any):** 
- create Mongo database on Mongo.com
- set up model for Property
- set up model for User
- set up controller for property.js
- set up controller for user.js
- create routes for property.js
- create routes for user.js
- create auth middleware
- test routes locally
- deploy to production server
---

## 2. Problem Statement

The problem for hosts is that AirBNB and VRBO are expensive and have commissions more than 13%, are large and unfocused with properties all over the world and do not offer much insite to a specific tourist region by providing information on places to go, events happening in the tourist region, or the ability to book caterers, guides, etc.

### 2.1 Current state

**[To complete]**

- What happens today?  Users browse properties on AirBNB or VRBO and those sites charge a huge commission to the hosts, thereby driving up the cost of the stay.
- What’s broken or missing?  A region specific vacation rental site that lists properties and charges a flat fee per year instead of a commission.
- Who is impacted (users, internal teams, business)? Hosts and travelers

### 2.2 Pain points

- Commissions and costs
- Little other vacation information
- No way to find properties to book directly and avoid commissions

### 2.3 Opportunity

**[To complete]** — Why solve this now? What’s the cost of not solving it?

---

## 3. Solution Overview

This site will be similar to AirBNB but allow the traveler to book directly.  Each property will have links to AirBNB, VRBO, and a direct link to book using Hostaway.  If the host does not use Hostaway, their contact information can be used.

### 3.1 Solution summary

**[To complete]**

- What we will build (product/feature/service).  An API that uses Mongo
- How it addresses the problem.  The API will also us to build a website.
- One-paragraph “elevator pitch.”  FLX Vacations cuts out the middleman and lets you book a vacation rental directly with the host and cut out the high commissions.

### 3.2 User / personas

| Stakeholder | Value |
|-------------|--------|
| [End-User] | |
| [Host] | |
| [Experience-Provider] | |

### 3.3 Out of scope (for this PRD)

- a booking engine
- guest reviews
- dynamic pricing

---

## 4. Technical Architecture

### Backend
- JavaScript
- Express
- Mongo DB

### Frontend
- Javascript
- Vue / Nuxt

### 4.1 High-level architecture

**[To complete]** — Diagram or bullet summary of:

- Frontend (if any), backend, data store(s).
- External systems (APIs, auth, payments, etc.).
- Deployment / hosting (e.g. serverless, containers, PaaS).

### 4.2 Technology stack

| Layer | Choice | Notes |
|-------|--------|--------|
| Runtime / language | JavaScript | |
| Framework | Vue / Nuxt | |
| Data store | MongoDB | |
| Auth | | |
| APIs / integrations | | |
| Hosting / deployment | Digital Ocean | |

### 4.3 Data model (summary)

**[To complete]** — Main entities and relationships (list or link to schema).

### 4.4 Security & compliance

- Authentication / authorization: 
- Data handling (PII, sensitive data): 
- Compliance (e.g. GDPR, HIPAA): 

### 4.5 Non-functional requirements

| Area | Requirement |
|------|-------------|
| Performance | |
| Availability / uptime | |
| Scalability | |
| Observability (logging, monitoring) | |

---

## 5. Functional Requirements

<!-- What the system must do, in a form we can use for design, build, and test. -->

### 5.1 User roles / personas

| Role | Description |
|------|-------------|
| Admin | Can create, read, update, delete all users and all properties|
| Host | Can read any property. Can create and update any property they own |
| User | Can read any property |

### 5.2 Features and requirements

<!-- Use a consistent format: Feature → User story / acceptance criteria. -->

#### HostAway Integration

**Feature:** [HostAway]

- **As a** [Host], **I want integration with [HostAway] so that [User] can book a booking directly using [HostAway] API, FLX Vacations can get prices and availability, etc.**
- **Acceptance criteria:**
  - [ ] Conntect to [HostAway] API
  - [ ] GET property price
  - [ ] GET property availability
  - [ ] POST property booking
  - [ ] UPDATE property availability

#### Create a Property Listing page

**Feature:** [Create-Listing]

- **As a** [Host], **I want** to create a property listing **so that** [Guest] can see images organized by room, learn about Host and see where they live, see key features of the property, see property type, read a description of the property, filter properties by amenities, read reviews, so location on a Google Map.
- **Acceptance criteria:**
  - [ ] Host can add pictures, organize pictures by room, add a writen description of a picture that is up to 250 characters, the picture discription should be shown when a user is looking at individual pictures and it should be in the alt value.  Guest can view pictures one of two ways.  One would be a page with a photo bar at the top with a thumbnail and room name for each room so Guest can jump to those pictures. Below that are two columns, the left has the room name like "Living room" with a brief description of that room like "Air conditioning, board games, books and reading material, TV" and the right column would be images in that room collection that are tiled and larger.  The Guest can click on an image to switch to individual photo view.  The second way the Guest can view pictures is the individual photo view.  In this view there is only one image with a black background behind the image.  Circular arrow buttons to advance or go back to prior image.  Hosts can add up to 30 images.
  - [ ] When a Host adds a photo, that photo should be stored in a Digital Ocean Spaces Object Storage bucket.  The endpoint for this bucket is 'https://flxvaca.nyc3.digitaloceanspaces.com' with Access Key Name 'flxvaca-2146494477', Access Key ID 'DO003HM4GT9FL9XZXRF9', with secret key '2+AgAUTZDDU+mm67LqePBr3eXm4V884GXzHV6xlW6hQ'.  These values should be stored in .ENV and not visible in the repo.  The database should have an array of images.
  - [ ] The Host should be able to select the lake they are on from a dropdown list of enum values from the database that include all the lakes in the Finger Lakes like "Seneca Lake", "Keuka Lake", etc.
  - [ ] The Host should be able to select multiple values for amenities from a check box list.  The property profile should display 10 of those amenities with a button that says "Show all [number of amenities] amenities".
  - [ ] The Admin can Edit a property and add photos.

#### Guest Reviews
- **As a** [Guest] **I want** to leave a review of the property **so that** other potential [Guest] can better know the property and if the property profile and images accurately reflect the property.

- **Acceptance criteria:**
  - [ ] Guest should be able to leave a review after staying at the property.
  - [ ] Guest reviews should be visible on the Property Profile page.  Each review should show [Guest] Profile Picture, City and State where [Guest] lives, 1 - 5 star review, Month and year the [Guest] stayed at the property, how long the [Guest] stayed at the property, the first 3 lines of the review with a "Show more" link or button.
  - [ ] The Guest Review section should show the last 6 reviews based on Date Stayed.
  - [ ] [Guest] may rate on a 1 - 5 scale the Cleanliness, Vibe, Check-in, Communication, Location, and Amenities.
  - [ ] At the top of the [Guest] Rating section, there should be a bar showing averages for the Cleanliness, Vibe, Check-in, Communication, Location, and Amenities.
  

**[Repeat as needed]**

### 5.3 API / integration requirements (if applicable)

- **Endpoints / contracts:** 
- **Third-party integrations:** 
- **Webhooks / events:** 

### 5.4 Edge cases & error handling

- Offline / degraded mode: 
- Validation & error messages: 
- Rate limits / quotas: 

---

## 6. Implementation Plan
### Kickoff
- [x] Set up files and folders
  - config
  - controllers
  - middleware
  - models
  - routes
  - utils
  - server.js

- [x] Set up entry point: server.js

- [x] Set up MVC for properties
- [x] Set up MVC for users

### Front End Creation
Project folder: flxvacations.com
- [x] Create project folder for frontend and install Nuxt
- [x] Install modules needed for this project including Tailwind
- [x] Create homepage that displays properties in a grid showing image, name, price range
- [x] Create a design using Tailwind that is similar to AirBNB
  - Use a text logo "FLXvacations"
  - Use a near white background
  - User should be able to search for properties by amenities, date picker
  - Menu should include "Homes", "Events", "Experiences", "Services"
  - Far right should have a hamburger menu with "Log in or sign up", "Become a host"
  - Create these pages
    - [x] Sign up page with fields "First Name", "Last Name", "Email", "Phone", "Password"
    - [x] Create a property listing page
    - [x] Events page (placeholder; wire API when ready)
      - API endpoint: https://flxcompass.com/api/v1/events
      - Below pagination, put "See more events at FLXcompass.com"

### Test
- [ ] Test locally
- [ ] Fix Issues
- [ ] Extend models as needed
- [ ] Extend routes as needed

### Authentication & Security
- [x] Implement security (JWT, auth middleware)
- [x] User, Host, Admin can log in (API + login page)
- [x] Host can only create, update, delete their own properties
- [x] Admin can CRUD any user or property
- [x] Add password field
- [x] Update newUsers.json / seeder with hashed password (pattern: first 3 letters first+last + '22'. e.g. JasBun22)
- [x] Password should be at least 8 characters long.
- [x] Add field createdAd with Date.now (via timestamps: createdAt/updatedAt)
- [x] Encrypt passwords
- [x] Create authentication middleware
- [x] Every property should be linked to at least one User ID.
- [x] Add functionality to reset password. User should be able to reset password.
- [x] User should be able to add a profile picture.
- [x] User should be able to add City, State of their location.
- [x] When user logs in, "Log in or sign up" should be replaced by their user pic, round circle in top right, right of Become a host button.  When a user logs in, they should stay logged in unless they log out or they will remain logged in for 30 days.
- [x] On /login page, user should be able to click an eye icon to view password.  Then a user can click eye-slash to again hide the password.
- [x] Admin should be able to click an edit button from any Property Profile.  The edit button should only be visible to Admins and Hosts that own that profile.

### 6.1 Phases

| Phase | Name | Scope | Target |
|-------|------|--------|--------|
| 1 | Kickoff | API scaffold, models, routes, seeder | Done |
| 2 | Front End Creation | Nuxt app, Tailwind, homepage, pages, FLXvacations design | — |
| 3 | Test | Test locally, fix issues, extend as needed | — |
| 4 | Authentication & Security | Auth, roles, host/admin rules | — |
| 5 | Deploy | Production deploy | — |

### 6.2 Phase 1 — Kickoff

**Goals:**
- Set up files and folders
- Set up entry point: server.js
- Set up models
- Set up controllers
- Set up routes
- Run locally and be able to hit route in browser

**Deliverables:**

- [x] Set up files and folders
- [x] Create MVP for Properties
- [x] Create MVP for Users
- [x] Run locally and be able to hit route in browser (see README: `npm run dev`, then open /api/health, /api/properties, /api/users)

**Dependencies / blockers:**

- 

### 6.3 Phase 2 — Front End Creation

**Goals:**
- Create Nuxt front end that consumes vaca-api (properties, users)
- Tailwind-based layout similar to AirBNB: near-white background, FLXvacations text logo
- Homepage property grid (image, name, price range); search by amenities and date
- Nav: Homes, Events, Experiences, Services; hamburger with “Log in or sign up”, “Become a host”
- Pages: Sign up, Create property listing, Events (flxcompass.com API)

**Deliverables:**

- [x] Create project folder for frontend and install Nuxt
- [x] Install modules (e.g. Tailwind) and configure
- [x] Homepage: property grid (image, name, price range); search (amenities, date picker)
- [x] Layout: FLXvacations logo, near-white background, nav (Homes, Events, Experiences, Services), hamburger (Log in or sign up, Become a host)
- [x] Sign up page: First Name, Last Name, Email, Phone, Password
- [x] Create a property listing page
- [x] Events page (uses flxcompass.com API) — placeholder; wire flxcompass.com when API is ready

**Dependencies / blockers:**

- vaca-api running (Phase 1); flxcompass.com API for Events

### 6.4 Phase 3 — Test

**Goals:**
- Test API and front end locally
- Fix issues and extend models/routes as needed

**Deliverables:**

- [ ] Test locally
- [ ] Fix issues
- [ ] Extend models as needed
- [ ] Extend routes as needed

**Dependencies / blockers:**

- 

### 6.5 Phase 4 — Authentication & Security

**Goals:**
- User, Host, Admin can log in
- Host can only create, update, delete their own properties
- Admin can CRUD any user or property

**Deliverables:**

- [x] Implement security (auth middleware, JWT or session)
- [x] User, Host, Admin can log in (login page wired to API)
- [x] Host can only create, update, delete their own properties
- [x] Admin can CRUD any user or property

### 6.6 Phase 5 — Deploy

**Goals:**
- Deploy API and front end to production

**Deliverables:**

- [ ] Deploy API to production server
- [ ] Deploy front end (e.g. Vercel, Netlify, or same host)
- [ ] Configure env and domains

**Dependencies / blockers:**

-

### 6.7 Dependencies (external)

- 
- 

### 6.8 Risks & mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| | | |

---

## 7. Success Metrics

<!-- How we’ll know the solution is successful. -->

### 7.1 Business / product metrics

| Metric | Target | How we measure |
|--------|--------|----------------|
| | | |
| | | |

### 7.2 User / experience metrics

| Metric | Target | How we measure |
|--------|--------|----------------|
| | | |
| | | |

### 7.3 Technical / quality metrics

| Metric | Target | How we measure |
|--------|--------|----------------|
| Uptime / availability | | |
| Latency / performance | | |
| Error rate | | |
| Test coverage (if applicable) | | |

### 7.4 Launch criteria

We consider the release successful when:

- [ ] 
- [ ] 
- [ ] 

---

## Appendix

### A. Glossary

| Term | Definition |
|------|------------|
| | |

### B. References

- 
- 
- 

### C. Changelog

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| | 0.1 | | Initial scaffolding |
