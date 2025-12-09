import GoalInputs from "./GoalInputs";
import GoalActions from "./GoalActions";
import SipConfig from "./SipConfig";
import useGoalFormLogic from "./useGoalFormLogic";

export default function GoalForm({ isEditing, goal_id, onCreated, onUpdated }) {
  const logic = useGoalFormLogic({ isEditing, goal_id, onCreated, onUpdated });

  return (
    <form
      onSubmit={logic.handleSubmit}
      className="p-4 bg-white rounded shadow mb-4"
    >
      {/* 1. Goal basic inputs */}
      <GoalInputs logic={logic} />

      {/* 2. Action buttons */}
      <GoalActions logic={logic} />

      {/* 3. Optional SIP creator */}
      <SipConfig logic={logic} />
    </form>
  );
}
