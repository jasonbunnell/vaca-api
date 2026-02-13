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
| Runtime / language | | |
| Framework | | |
| Data store | | |
| Auth | | |
| APIs / integrations | | |
| Hosting / deployment | | |

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

#### [Feature area 2]

**Feature:** [Name]

- **As a** [role], **I want** [action/capability] **so that** [outcome].
- **Acceptance criteria:**
  - [ ] 
  - [ ] 

#### [Feature area 3]

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

### Test
- [ ] Test locally
- [ ] Fix Issues
- [ ] Extend models as needed
- [ ] Extend routes as needed

### Authentication & Security
- [ ] Implement security
- [ ] User, Host, Admin can log in
- [ ] Host can only create, update, delete their own properties
- [ ] Admin can CRUD any user or property

### 6.1 Phases

| Phase | Name | Scope | Target |
|-------|------|--------|--------|
| 1 | Kickoff | | |
| 2 | Test | | |
| 3 | Deploy | | |

### 6.2 Phase 1 — [Kickoff]

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

### 6.3 Phase 2 — [Name]

**Goals:**

- 
- 

**Deliverables:**

- [ ] 
- [ ] 
- [ ] 

### 6.4 Phase 3 — [Name]

**Goals:**

- 
- 

**Deliverables:**

- [ ] 
- [ ] 
- [ ] 

### 6.5 Dependencies (external)

- 
- 

### 6.6 Risks & mitigations

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
