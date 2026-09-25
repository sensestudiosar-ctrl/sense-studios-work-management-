# Approved clarifications and addenda

The original 115-section requirements remain unchanged at APPROVED_REQUIREMENTS.md. This file records newer owner instructions without erasing source history. In conflicts, the newer explicit clarification takes precedence.

## C-001 — Branch-only organizational model (approved 2026-09-25)

The organizational hierarchy is **Organization → Branch → Team → Employee**. One organization may have multiple branches. Each project has exactly one owning branch. Employees belong to the appropriate organizational/branch structure; explicitly authorized project assignments may permit cross-branch work.

There is **no separate Brand model, entity, table, permission scope or architectural layer**. Any source use of “Brand” or “multi-brand” describing organizational partitioning and isolation is superseded by Branch and branch isolation. This applies to introductory text and source sections R-004, R-006, R-007, R-092, R-093, R-094, R-103 and R-113. Other uses of role, team, project membership and explicit permission overrides remain meaningful and are not renamed.

The original source lists “Departments” and “Hierarchy” as organizational layers. The approved hierarchy has no Department level. Reporting-manager relationships and dynamic job roles may still be needed for Team Leader authority and assignment recommendations, but they must live within the approved Organization/Branch/Team/Employee structure, not create another organizational tier. Their exact cardinality and grant authority are pending owner decisions Q1 and Q15 in REQUIREMENT_QUESTIONS.md.

This clarification changes organizational structure only. It does not remove any project, task, review, file, workforce, site, portal, analytics, automation or AI capability from the original source.
