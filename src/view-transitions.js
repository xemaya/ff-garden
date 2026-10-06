// A map-return animation interpolates the camera, not the player's street anchor.
export function captureStreetPose(pose,transition){
  return {...(transition?.returningToStreet?transition.target:pose)};
}
