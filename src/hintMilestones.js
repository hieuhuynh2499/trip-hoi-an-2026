export const getNextUnpromptedHintMilestone = ({ totalScore, hintThreshold, promptedMilestones }) => {
  const threshold = Math.floor(Number(hintThreshold))
  if (!Number.isFinite(threshold) || threshold <= 0) return null

  for (let milestone = threshold; milestone <= totalScore; milestone += threshold) {
    if (!promptedMilestones[milestone]) return milestone
  }

  return null
}
