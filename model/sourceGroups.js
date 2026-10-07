/**
 * @param {string | undefined} group - a source group, subgroups separated by "/"
 * @returns {string[]} - the group and subgroup names, outermost first
 */
const getSourceGroupSegments = (group) => {
    if (!group) {
        return [];
    }
    const rawSegments = group.split("/");
    // the source selector drops the empty segment a trailing "/" leaves
    return rawSegments.filter((segment) => segment !== "");
};

export { getSourceGroupSegments };
