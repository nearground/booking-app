# Missing Features & Implementation Checklist

This document lists missing features, improvements, and implementation tasks for multi-schedule support (backend + frontend), prioritized and grouped for action.

## Non-App, missing
- Infrastructure planning: Terraform (AWS ECS, GCP and Azure Kubernetes), Ansible, etc.
- Development strategy
- Research MCP for document generation
- Technical documentation (features, architecture, database design, implementation plan, disaster recovery, testing strategy, performance metrics)
- Business plan
- SEO, Analytics

- Work Planning App (Vikunja or otherwise)
- Roadmap
- Create usage docs.

## Non-App, blockers

- Money


## Non-App, Nice To Haves

- CRM

## Missing Features


### Not yet groomed
- Separate API from frontend into different projects
- Guest checkout into account creation flow
- Moderation features for user image uploads
- Intra-org communication method/ bulletin board, org vs experience scope
- Validate that booking confirmation and tab shows experience question answers and day-of contact number (done)
- Show a Contact button in the bookings tab (done)
- Extract services features out of controllers (separation of concerns) (technically blocker but this should be the most important)
- Architecture review + microservice shakedown
- Privacy Policy, Cookies, Terms & Conditions, About, Contact
- Newsletter subscribe + news template
- Email design
- Overhaul Experience creation process:
- Waiver creation ability: checkbox "By checking this box I agree that" "(in subtitle: 1. I understand that... 2. blah blah)"

- Profile pages for users, organizer, and organizations.
- role-based access policies with corresponding models, controller, etc. and E2E
- Rework organization model
- Talk to accountant and implement generated paperwork or receipts or whatever
- ScheduledExperience details page for pulling all relevant information like users registered, questionnaire answers, ticket tiers, organizers assigned, etc.
- Access any scheduled experience details from the Upcoming Sessions view: Implement pagination, being able to click
- invoice, statements,  report generator (possible invoice model)
- Email notifications for organizer replies
- Daily/Weekly/Monthly/Quarterly metrics generator with revenue and ratings statistics with breakdowns for organizer and experience.
- Ability to cancel scheduled experiences
- Ability to assign organizers to schedules during experience creation and editing.
- Create smoke testing
- E2E testing
- Create SERVICE MODE OUT OF EXPERIENCE MODE

## Release Blockers
- Separate organization user from regular user
- Payment method integrations
- Favorite reviews
- Option to showcase recent 5-star reviews in experienceDetails page. 
- Change db schema so that ExperienceReservationAttendee is tied to each ticket and tier purchased in ExperienceReservation (done?)
- Add seeder reservations to scheduled experiences for testing session details
- Fix 500 errors: remove availableCities and nearbyExperiences logic.
- Create Experience schedule calendar preview shows incorrect spots available (same w preview)
- Hide password when creating user (done)

- Trigger schedule resync upon schedule update (done sorta)
- Schedule cleanup for PickedOccurrences that already passed
- Verify carts are cleaned up after (they are marked as abandoned, so done?)
- Do not count replies towards rating average. (done?)
- Refactor /backend and /frontend projects to ESM. (done)
- Fix all vulnerabilities
- Fix toast notifications throughout the app
- Review (comments) logic (It glitches out and doesnt load properly when trying to fetch comments that have replies. Extend might be bigger.)
- Fix comment display bugs in organizer profile modal (organizer name not displaying properly in reply, and reply renders outside of parent comment instead of inside).
- Add redis and optimize project for redis cache. (done)
- E2E functionality for creating, deleting, and editing comments for logged-in users from within experience details page or their user profile. (done)
- Update the comments in experience details to show replies. (done)
- Smoke Testing
- Load Testing
- Remove comment length lower limit.
- Clear comment field after posting a comment.
- Set comment max to 1 per user/event/day?
- Rate limiting for Reviews
- Make sure EVERYTHING that CAN be cached IS cached

## Nice To Haves
- Cash payment option
- Add Date Of Birth to User creation / model or remove altogether
- Lazy load or paginate Organizer modal comments
- Run lint & start dev server to verify runtime behavior and fix any build/runtime errors.
- Write business plan. — Estimate: 8
- Add a news section to the website with CMS, labeled "News". — Estimate: 8
- Allow scheduled experiences to overlap in time
- Add end-to-end tests covering create/edit experience flows with multiple schedules. — Estimate: 13
- Audit scheduler materialization for edge cases (DST transitions, timezone conversions, overlaps). — Estimate: 8
- Timezone handling audit: ensure location timezone is used consistently and no timezone leaks from UI. — Estimate: 5
- UI/UX polish for `ScheduleBuilder` (clearer add/edit flows, empty-state messaging). — Estimate: 5
- Accessibility improvements (keyboard navigation, ARIA labels for schedule items). — Estimate: 5
- Improve error handling & user feedback when schedule creation/validation fails. — Estimate: 3
- Perform SEO: content strategy, continual content creation, linkbuilding, internationalization, and monthly monitoring. — Estimate: 13
- Implement online checkout logic. — Estimate: 13
- Add an online marketplace to the website under a new section labeled "Marketplace". — Estimate: 21
- Add a new schedule template: schedule template with fields for time range, experience duration override (optional), and break times (optional). It creates experiences within the given schedule and time ranges, padded by given break time.  — Estimate: 13
- Separate tables into their own database — Estimate: 13
- Perform a microservice shakedown analysis and create a document — Estimate: 8
- Plan CRM.
  
## Embellishments

- Add logging & monitoring hooks for scheduler and materialization jobs. — Estimate: 5
- Update API docs with examples and sample payloads (`backend/docs/experiences-schedules.md`). — Estimate: 3
- Performance and pagination tuning for schedule listing endpoints. — Estimate: 8
- Load test
- Performance test
- Add analytics software — Estimate: 3
- Write PM agent — Estimate: 3
- Write Technical Manager agent. — Estimate: 3
- Write UX agent. — Estimate: 3
- Write Marketing agent. — Estimate: 3
- Add weather banner to the top of the page for Puerto Vallarta. — Estimate: 2
- Add a new section to the website for news — Estimate: 1 (clarify)
- Remove Save Meeting point button and instead save on submit — Estimate: 2

## Notes & Next Steps

## C-level Agents

https://www.chiefjobs.com/all-c-suite-job-titles-roles-and-responsibilities-explained/



## Coding Agents
C-suite 
    Project Lead
        Software Architect
            DevOps Lead
                SecOps engineer
                SRE engineer
            Tech Lead
                Backend Software Lead
                    DB Engineer
                    Backend Software Developer
                Frontend Software Lead
                    UX/UI 
                    Frontend Software Developer
                Testing Lead
                    Smoke testing dev
                    Sanity testing dev
                    Regression Testing dev
                    Integration testing dev
                    E2E testing dev
                    Load Testing
                Code Review lead
                Documentation Lead
        







Infrastructure as Code, role based access control, and compliance as code to enforce security throughout the lifecycle. It integrates with SIEM and SOAR platforms to provide real time telemetry, anomaly detection, and automated policy enforcement.

With modular APIs, encryption aligned with FIPS 140 3 standards, and container orchestration using Kubernetes

 SCAP validation for STIG compliance and integrates with GitOps workflows to support declarative deployments across development, test, and production environments. 

 Our capabilities range across Artificial Intelligence, Blockchain, Cybersecurity, DevSecOps, Open Source, Modeling, Simulation and other technology consulting services. With an intimate understanding of your mission, LNB Federal deploys the best solution for your unique environment and selects the right partners and products for high-velocity outcomes. 

 More than just trusted advisors and capable technologists, we’re your all-in-one acceleration architects, with a focus on helping you enhance mission readiness and resilience faster through the application of powerful emerging technologies.



 API Testing with Postman MCP (Design API so it is testable this way too)

 Move all applicable services to Lambda.

 


 ## Already implemented

 
- Update login process to use instead username + password for regular users, and organization name + username + password for organizers. organizer accounts cannot belong to more than one organization, though they may create multiple accounts from one email. Update the organization model to include organization username as a non-nullable primary key. Update seeder files to include this new organization username (generate the organization username based off the Organization name, all lowercase and no spaces). (done)

- Separate the Organizations tab of the organizer-profile into two tabs: One labeled "Organization" for managing users and org. invites, and "Experiences" for managing experiences. refactor code into reusable components in aesthetically pleasing layouts using modern UX/UI standards. (done)

- Update the Experience tab to be able to edit experiences, reusing the CreateExperience component. Refactor this component if necessary. If the schedule is changed during edit mode, show an alert that the schedule must be synced manually from the Experiences tab. (done)

- From the Experience organizer-profile tab, add the capability of disabling automatic schedule syncing for sessions globally and per-session. 

- From the Experience organizer-profile tab, add the capability of "schedule update lookahead"-- When syncing schedules, Have the user select how far ahead the scheduler should populate the scheduled experiences, (e.g. schedule 1 year and 3 months at a time). Possibly, update the Experience model to include this new variable.

- Deprecate the "scheduling" row in the Experience model. Update the seeder files to create and utilize ScheduleTemplates built from the old scheduling cron expressions, and a PickedOccurrence set 1 day from when the seeder is run, at 3:33 PM (both set to the correct experience timezone).

- From the Experience organizer-profile tab, add the capability of "schedule update bounds"-- Allow the option to one-off populate a schedule within designated start and end datetimes, leveraging the component for the create-experience schedule builder for a more cohesive UX/UI.

- Rework the schedule builder component, so that the following capabilities are available to the organizer: add the optional capability of "scheduling end date", past which the the schedule update lookahead option stops, and disables automatic syncing when the datetime is reached until the user enables it again. Update the relevant models if necessary.

- Rework the schedule builder component, so that the following capabilities are available to the organizer: In the schedule builder component (for experience creation and when editing), add the optional capability of "scheduling start date". When set, the automatic scheduler only schedules experiences between the start date, and until the end of the lookahead period. It is cleared when the date is reached. 

- Rework the schedule builder component, so that the following capabilities are available to the organizer: When updating the schedule for an existing experience, allow the user to set a new scheduling start date, starting at the end of the previous schedule's lookahead. In this the option for the user to cancel all the old non-empty scheduled sessions (warning the user that they must manage the non-empty sessions manually).

- Email booking confirmation to primary contact email, prefaced with a short, personalized confirmation message.

- Implement email-based username lookup using spacemail mailserver for both regular users and organizers. Provide the user's username (or usernames if email has multiple matches) if the given email matches one or more accounts in the system. If the username is an organizer account, provide also the matching organization username. (done)

- Implement password recovery using spacemail mailserver for both regular users and organizers. 

- Implement password recovery using spacemail mailserver. 
and organization invite email

- Limit posting experience reviews to maximum one every two weeks for the same bookable and user.

- Hide/remove the post comment section of experienceDetails after the user posts a comment, showing instead the notice "Thank you for your review!". Show the posted review underneath with edit and delete buttons.

- Do not show the post comment section of ExperienceDetails if the user has posted a review in the experience before in the past two weeks, showing instead the notice "You have already recently posted a review for this experience". Show the posted review underneath with edit and delete buttons.

- Add length limit of 75 characters for review titles, and also add word break.

- Refactor the logic in ExperienceDetails for displaying the experience images modal into a reusable component. Name it ImageGalleryModal. Create additional subcomponents if it is in line with best practices.

- Add the capability for attaching and displaying multiple images in reviews. The first three should be seen as thumbnails, with the third one displaying "+X" if there are additional iamges, The functionality for displaying images should repurpose the new ImageGalleryModal. (done)

- Display user-uploaded images in the experience image gallery in addition to the organizer-uploaded images. For user-uploaded images, display also the relevant review to the left of the image, reusing components as much as possible, only modifying the ImageGalleryModal if best practices call for it. (done)
