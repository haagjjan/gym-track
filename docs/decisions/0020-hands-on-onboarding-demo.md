# ADR 0020: Isolated hands-on onboarding

Status: Accepted

## Decision

Replace the text tour with an optional hands-on example under authenticated `/help/demo` routes. The demo owns an in-memory workout store in its route layout. Production controls accept explicit data and action props; live API hooks remain in production containers. No request interception, demo database account, personal query-cache seeding, or browser draft persistence is used.

A curated catalog-backed template and eight relative-date workouts demonstrate logging, History, Progress and Volume. Demo summaries follow the documented analytics rules. Only an explicit template copy writes domain data through the existing template API. Copying never creates exercises, sets or workouts. Lesson flags use the existing onboarding API.

A data migration marks existing accounts as having handled the invitation. New accounts are eligible; existing accounts enter from Help. Completed and skipped lessons have separate flags. Replaying never clears real-workout milestones.

## Consequences

Demo navigation retains practice until leaving the route layout or refreshing. A fresh mount always offers restart or exploration. Live and demo screens share presentational components but have distinct controllers. This bounded separation prevents examples from entering personal history or analytics. No new framework or dependency is required.
