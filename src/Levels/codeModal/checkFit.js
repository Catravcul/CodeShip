/**
 * Check if two html elements share offset[left, top, width, height]
 * @param {object} slot html element which offset values would increment by margin parameter
 * @param {object} subject html element
 * @param {number} margin 
 * @returns boolean
 */
export const checkFit = (slot, subject, margin=0) => {
    const {left: slotLeft, top: slotTop, right: slotRight, bottom: slotBottom} = slot.getBoundingClientRect()
    const {left: subjectLeft, top: subjectTop, right: subjectRight, bottom: subjectBottom} = subject.getBoundingClientRect()
    let answer = false
    if ((slotLeft - margin) < subjectLeft && (slotRight + margin) > subjectRight) {
        if ((slotTop - margin) < subjectTop && (slotBottom + margin) > subjectBottom) {
            answer = true
        }
    }
    return answer
}