/**
 * Check if two html elements share offset[left, top, width, height]
 * @param {object} slot html element which offset values would increment by margin parameter
 * @param {object} subject html element
 * @param {number} margin 
 * @returns boolean
 */
export const checkFit = (slot, subject, margin=0) => {
    const {offsetLeft: slotLeft, offsetTop: slotTop} = slot
    const slotRight = slotLeft + slot.offsetWidth
    const slotBottom = slotTop + slot.offsetHeight
    const {offsetLeft: subjectLeft, offsetTop: subjectTop} = subject
    const subjectRight = subjectLeft + subject.offsetWidth
    const subjectBottom = subjectTop + subject.offsetHeight
    let answer = false
    if ((slotLeft - margin) < subjectLeft && (slotRight + margin) > subjectRight) {
        if ((slotTop - margin) < subjectTop && (slotBottom + margin) > subjectBottom) {
            answer = true
        }
    }
    return answer
}