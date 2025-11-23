# TODO: Implement "Reuse Approved Topic" Feature

## Backend
1. Add API endpoint `GET /api/topics/approved` in DetaiController.php
   - Returns list of topics with status "Đã duyệt" for the current logged-in lecturer.
   
2. Add API endpoint `POST /api/topics/reuse` in DetaiController.php
   - Accepts existing topic ID and new plan ID.
   - Creates a new topic by copying the selected approved topic but assigning it to the new plan.
   - Returns the new topic data.
   
## Frontend
1. Modify CreateTopicDialog.jsx
   - Add a "Reuse Topic" button in the dialog footer.
   - Clicking the button opens a new ReuseTopicDialog.

2. Create ReuseTopicDialog.jsx (new component)
   - Fetch and display list of approved topics by current lecturer.
   - Allow selecting one topic.
   - Confirm reuse button calls `reuse` API with selected topic ID and current plan ID.
   - On success, close reuse dialog and close CreateTopicDialog (or refresh).

3. Update API client services to include:
   - getApprovedTopics()
   - reuseTopic(existingTopicId, newPlanId)

## Testing
1. Test backend APIs with valid and invalid inputs.
2. Test frontend dialogs and flows including reuse button and dialog.
3. Ensure consistent UI/UX and error handling.

## Followup
- Refine UI placement and feedback based on user interaction.
- Ensure permissions and security checks.

---

I will start implementing these steps after your confirmation.
