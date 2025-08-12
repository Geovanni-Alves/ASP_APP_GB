// components/PickupPlanner/PickupPlanner.jsx
import React from "react";
import PickupPlannerRender from "./PickupPlannerRender";
import { usePickupPlanner } from "./usePickupPlanner";

export default function PickupPlanner({ closeMenu }) {
  const props = usePickupPlanner({ closeMenu });
  return <PickupPlannerRender {...props} />;
}
