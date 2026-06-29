# Advanced Features Task Checklist

## Backend
- [ ] Create `server/routes/draft.js` (POST /api/draft)
- [ ] Register draft route in `server/server.js`

## Frontend Context
- [ ] Update `client/src/context/PipelineContext.jsx`
  - Add `generateDraft(nba)`
  - Add `recalculateRecommendations()`
  - Update `handleRegisterCategory` to support updating/editing categories

## Frontend Components
- [ ] Update `client/src/components/Pages/Recommendations.jsx` (Draft Modal + layout)
- [ ] Update `client/src/components/Pages/AgentPipeline.jsx` (Inline Blackboard Editing + Recalculate banner)
- [ ] Update `client/src/components/Pages/PlatformConfig.jsx` (Visual Playbook Manager)
- [ ] Update `client/src/components/Pages/Analytics.jsx` (CSS Charts: Category distribution, Urgency breakdown, Approval ring)

## CSS & Styling
- [ ] Update `client/src/index.css` (Styles for charts, draft modal, and edit icons)
