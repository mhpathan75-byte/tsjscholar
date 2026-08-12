import { auth, defineMcp } from "@lovable.dev/mcp-js";

import whoamiTool from "./tools/whoami";
import listAnnouncementsTool from "./tools/list-announcements";
import listCalendarEventsTool from "./tools/list-calendar-events";
import listTestResultsTool from "./tools/list-test-results";
import listDoubtsTool from "./tools/list-doubts";
import askDoubtTool from "./tools/ask-doubt";
import listLiveClassesTool from "./tools/list-live-classes";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "polished-learner-app",
  title: "Polished Learner App",
  version: "0.1.0",
  instructions:
    "Tools for the TSJ Scholar Palanpur school app. Callers act as the signed-in student, teacher or principal: read announcements, calendar events, live classes, test results and doubts, and post new doubts.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    whoamiTool,
    listAnnouncementsTool,
    listCalendarEventsTool,
    listLiveClassesTool,
    listTestResultsTool,
    listDoubtsTool,
    askDoubtTool,
  ],
});
