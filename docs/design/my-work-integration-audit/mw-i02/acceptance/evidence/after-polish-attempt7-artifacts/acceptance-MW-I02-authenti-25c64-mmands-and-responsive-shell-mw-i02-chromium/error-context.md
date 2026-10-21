# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: acceptance.spec.ts >> MW-I02 authenticated task acceptance: real identities, populated views, commands, and responsive shell
- Location: .env.checkpoint-tools\mw-i02-acceptance\acceptance.spec.ts:177:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: 'Active personal tasks: 64', exact: true })
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('button', { name: 'Active personal tasks: 64', exact: true }) with timeout 15000ms
  - waiting for getByRole('button', { name: 'Active personal tasks: 64', exact: true })

```

```yaml
- text: CONTROLLED PHASE COUNT RESPONSE — supplemental acceptance capture
- banner:
  - link "Sense Studios home":
    - /url: /
    - text: S
    - strong: SENSE STUDIOS
    - text: WORK MANAGEMENT
  - text: IDENTITY
  - link "Notifications":
    - /url: /notifications
  - button "Log out"
- navigation "Main workspace destinations":
  - link "Dashboard":
    - /url: /dashboard
  - link "My Work":
    - /url: /my-work
  - link "Tasks":
    - /url: /tasks
  - link "Project documents":
    - /url: /documents
- button "More"
- main:
  - text: My Work mw-i02-designer@example.test
  - region "My work":
    - heading "My work" [level=2]
    - button "Create task"
    - region "Personal task phases":
      - paragraph: "Your tasks: owner or collaborator."
      - group: About task counts
      - article:
        - 'button "Active personal tasks: Not available"':
          - text: Active personal tasks
          - strong: Not available
        - status: Not available to this account.
      - article:
        - 'button "Waiting personal tasks: 1"':
          - text: Waiting personal tasks
          - strong: "1"
      - article:
        - 'button "Personal tasks in review phase: 1"':
          - text: Personal tasks in review phase
          - strong: "1"
      - article:
        - 'button "Completed personal tasks: 5"':
          - text: Completed personal tasks
          - strong: "5"
    - text: Display
    - combobox "Task display mode":
      - option "List" [selected]
      - option "Cards"
      - option "Kanban"
      - option "Timeline"
    - button "Refresh"
    - form "Task filters":
      - text: Search tasks
      - textbox "Search tasks"
      - group: Filters & sort · 1 applied
      - button "Apply filters"
      - button "Reset filters"
    - text: Showing 1–50 of 64 filtered tasks
    - button "Previous" [disabled]
    - button "Next"
    - navigation "My tasks":
      - heading "My tasks 64" [level=3]
      - 'button "Open task: MW-I02 stale version 5157504c"':
        - text: Task
        - strong: MW-I02 stale version 5157504c
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: LOW
        - text: Status In progress Target
        - strong: 2026-12-22
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: LOW. Status: In progress. Target date: 2026-12-22. Committed date: Not committed."
      - 'button "Open task: MW-I02 designer private db88f41b"':
        - text: Task
        - strong: MW-I02 designer private db88f41b
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: HIGH
        - text: Status Not started Target
        - strong: 2026-12-20
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: HIGH. Status: Not started. Target date: 2026-12-20. Committed date: Not committed."
      - 'button "Open task: MW-I02 stale version 1fb422fa"':
        - text: Task
        - strong: MW-I02 stale version 1fb422fa
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: LOW
        - text: Status In progress Target
        - strong: 2026-12-22
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: LOW. Status: In progress. Target date: 2026-12-22. Committed date: Not committed."
      - 'button "Open task: MW-I02 designer private fd24022e"':
        - text: Task
        - strong: MW-I02 designer private fd24022e
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: HIGH
        - text: Status Not started Target
        - strong: 2026-12-20
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: HIGH. Status: Not started. Target date: 2026-12-20. Committed date: Not committed."
      - 'button "Open task: MW-I02 stale version 55c4e8b0"':
        - text: Task
        - strong: MW-I02 stale version 55c4e8b0
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: LOW
        - text: Status In progress Target
        - strong: 2026-12-22
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: LOW. Status: In progress. Target date: 2026-12-22. Committed date: Not committed."
      - 'button "Open task: MW-I02 designer private 76735a27"':
        - text: Task
        - strong: MW-I02 designer private 76735a27
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: HIGH
        - text: Status Not started Target
        - strong: 2026-12-20
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: HIGH. Status: Not started. Target date: 2026-12-20. Committed date: Not committed."
      - 'button "Open task: MW-I02 stale version f40ad1ce"':
        - text: Task
        - strong: MW-I02 stale version f40ad1ce
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: LOW
        - text: Status In progress Target
        - strong: 2026-12-22
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: LOW. Status: In progress. Target date: 2026-12-22. Committed date: Not committed."
      - 'button "Open task: MW-I02 designer private b0b8ca15"':
        - text: Task
        - strong: MW-I02 designer private b0b8ca15
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: HIGH
        - text: Status Not started Target
        - strong: 2026-12-20
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: HIGH. Status: Not started. Target date: 2026-12-20. Committed date: Not committed."
      - 'button "Open task: MW-I02 stale version 2c0730db"':
        - text: Task
        - strong: MW-I02 stale version 2c0730db
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: LOW
        - text: Status In progress Target
        - strong: 2026-12-22
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: LOW. Status: In progress. Target date: 2026-12-22. Committed date: Not committed."
      - 'button "Open task: MW-I02 designer private 749ac6f2"':
        - text: Task
        - strong: MW-I02 designer private 749ac6f2
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: HIGH
        - text: Status Not started Target
        - strong: 2026-12-20
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: HIGH. Status: Not started. Target date: 2026-12-20. Committed date: Not committed."
      - 'button "Open task: Confirm bathroom tile measurements 1ed458fe"':
        - text: Task
        - strong: Confirm bathroom tile measurements 1ed458fe
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: MEDIUM
        - text: Status Waiting Target
        - strong: 2026-11-18
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: MEDIUM. Status: Waiting. Target date: 2026-11-18. Committed date: Not committed."
      - 'button "Open task: MW-I02 queue 1ed458fe 52"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 52
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: CRITICAL
        - text: Status In progress Target
        - strong: 2026-11-25
        - text: Committed
        - strong: 2026-11-30
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: CRITICAL. Status: In progress. Target date: 2026-11-25. Committed date: 2026-11-30."
      - 'button "Open task: MW-I02 queue 1ed458fe 51"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 51
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: HIGH
        - text: Status Not started Target
        - strong: 2026-11-24
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: HIGH. Status: Not started. Target date: 2026-11-24. Committed date: Not committed."
      - 'button "Open task: MW-I02 queue 1ed458fe 50"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 50
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: MEDIUM
        - text: Status Not started Target
        - strong: 2026-11-23
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: MEDIUM. Status: Not started. Target date: 2026-11-23. Committed date: Not committed."
      - 'button "Open task: MW-I02 queue 1ed458fe 49"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 49
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: LOW
        - text: Status Not started Target
        - strong: 2026-11-22
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: LOW. Status: Not started. Target date: 2026-11-22. Committed date: Not committed."
      - 'button "Open task: MW-I02 queue 1ed458fe 48"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 48
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: CRITICAL
        - text: Status Not started Target
        - strong: 2026-11-21
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: CRITICAL. Status: Not started. Target date: 2026-11-21. Committed date: Not committed."
      - 'button "Open task: MW-I02 queue 1ed458fe 47"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 47
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: HIGH
        - text: Status Not started Target
        - strong: 2026-11-20
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: HIGH. Status: Not started. Target date: 2026-11-20. Committed date: Not committed."
      - 'button "Open task: MW-I02 queue 1ed458fe 46"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 46
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: MEDIUM
        - text: Status Not started Target
        - strong: 2026-11-19
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: MEDIUM. Status: Not started. Target date: 2026-11-19. Committed date: Not committed."
      - 'button "Open task: MW-I02 queue 1ed458fe 45"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 45
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: LOW
        - text: Status Not started Target
        - strong: 2026-11-18
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: LOW. Status: Not started. Target date: 2026-11-18. Committed date: Not committed."
      - 'button "Open task: MW-I02 queue 1ed458fe 44"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 44
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: CRITICAL
        - text: Status Not started Target
        - strong: 2026-11-17
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: CRITICAL. Status: Not started. Target date: 2026-11-17. Committed date: Not committed."
      - 'button "Open task: MW-I02 queue 1ed458fe 43"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 43
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: HIGH
        - text: Status Not started Target
        - strong: 2026-11-16
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: HIGH. Status: Not started. Target date: 2026-11-16. Committed date: Not committed."
      - 'button "Open task: MW-I02 queue 1ed458fe 42"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 42
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: MEDIUM
        - text: Status Not started Target
        - strong: 2026-11-15
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: MEDIUM. Status: Not started. Target date: 2026-11-15. Committed date: Not committed."
      - 'button "Open task: MW-I02 queue 1ed458fe 41"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 41
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: LOW
        - text: Status Not started Target
        - strong: 2026-11-14
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: LOW. Status: Not started. Target date: 2026-11-14. Committed date: Not committed."
      - 'button "Open task: MW-I02 queue 1ed458fe 40"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 40
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: CRITICAL
        - text: Status Not started Target
        - strong: 2026-11-13
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: CRITICAL. Status: Not started. Target date: 2026-11-13. Committed date: Not committed."
      - 'button "Open task: MW-I02 queue 1ed458fe 39"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 39
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: HIGH
        - text: Status Not started Target
        - strong: 2026-11-12
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: HIGH. Status: Not started. Target date: 2026-11-12. Committed date: Not committed."
      - 'button "Open task: MW-I02 queue 1ed458fe 38"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 38
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: MEDIUM
        - text: Status Not started Target
        - strong: 2026-11-11
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: MEDIUM. Status: Not started. Target date: 2026-11-11. Committed date: Not committed."
      - 'button "Open task: MW-I02 queue 1ed458fe 37"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 37
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: LOW
        - text: Status Not started Target
        - strong: 2026-11-10
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: LOW. Status: Not started. Target date: 2026-11-10. Committed date: Not committed."
      - 'button "Open task: MW-I02 queue 1ed458fe 36"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 36
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: CRITICAL
        - text: Status Not started Target
        - strong: 2026-11-09
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: CRITICAL. Status: Not started. Target date: 2026-11-09. Committed date: Not committed."
      - 'button "Open task: MW-I02 queue 1ed458fe 35"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 35
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: HIGH
        - text: Status Not started Target
        - strong: 2026-11-08
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: HIGH. Status: Not started. Target date: 2026-11-08. Committed date: Not committed."
      - 'button "Open task: MW-I02 queue 1ed458fe 34"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 34
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: MEDIUM
        - text: Status Not started Target
        - strong: 2026-11-07
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: MEDIUM. Status: Not started. Target date: 2026-11-07. Committed date: Not committed."
      - 'button "Open task: MW-I02 queue 1ed458fe 33"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 33
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: LOW
        - text: Status Not started Target
        - strong: 2026-11-06
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: LOW. Status: Not started. Target date: 2026-11-06. Committed date: Not committed."
      - 'button "Open task: MW-I02 queue 1ed458fe 32"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 32
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: CRITICAL
        - text: Status Not started Target
        - strong: 2026-11-05
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: CRITICAL. Status: Not started. Target date: 2026-11-05. Committed date: Not committed."
      - 'button "Open task: MW-I02 queue 1ed458fe 31"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 31
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: HIGH
        - text: Status Not started Target
        - strong: 2026-11-04
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: HIGH. Status: Not started. Target date: 2026-11-04. Committed date: Not committed."
      - 'button "Open task: MW-I02 queue 1ed458fe 30"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 30
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: MEDIUM
        - text: Status Not started Target
        - strong: 2026-11-03
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: MEDIUM. Status: Not started. Target date: 2026-11-03. Committed date: Not committed."
      - 'button "Open task: MW-I02 queue 1ed458fe 29"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 29
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: LOW
        - text: Status Not started Target
        - strong: 2026-11-02
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: LOW. Status: Not started. Target date: 2026-11-02. Committed date: Not committed."
      - 'button "Open task: MW-I02 queue 1ed458fe 28"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 28
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: CRITICAL
        - text: Status Not started Target
        - strong: 2026-11-01
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: CRITICAL. Status: Not started. Target date: 2026-11-01. Committed date: Not committed."
      - 'button "Open task: MW-I02 queue 1ed458fe 27"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 27
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: HIGH
        - text: Status Not started Target
        - strong: 2026-11-27
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: HIGH. Status: Not started. Target date: 2026-11-27. Committed date: Not committed."
      - 'button "Open task: MW-I02 queue 1ed458fe 26"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 26
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: MEDIUM
        - text: Status Not started Target
        - strong: 2026-11-26
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: MEDIUM. Status: Not started. Target date: 2026-11-26. Committed date: Not committed."
      - 'button "Open task: MW-I02 queue 1ed458fe 25"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 25
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: LOW
        - text: Status Not started Target
        - strong: 2026-11-25
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: LOW. Status: Not started. Target date: 2026-11-25. Committed date: Not committed."
      - 'button "Open task: MW-I02 queue 1ed458fe 24"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 24
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: CRITICAL
        - text: Status Not started Target
        - strong: 2026-11-24
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: CRITICAL. Status: Not started. Target date: 2026-11-24. Committed date: Not committed."
      - 'button "Open task: MW-I02 queue 1ed458fe 23"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 23
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: HIGH
        - text: Status Not started Target
        - strong: 2026-11-23
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: HIGH. Status: Not started. Target date: 2026-11-23. Committed date: Not committed."
      - 'button "Open task: MW-I02 queue 1ed458fe 22"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 22
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: MEDIUM
        - text: Status Not started Target
        - strong: 2026-11-22
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: MEDIUM. Status: Not started. Target date: 2026-11-22. Committed date: Not committed."
      - 'button "Open task: MW-I02 queue 1ed458fe 21"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 21
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: LOW
        - text: Status Not started Target
        - strong: 2026-11-21
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: LOW. Status: Not started. Target date: 2026-11-21. Committed date: Not committed."
      - 'button "Open task: MW-I02 queue 1ed458fe 20"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 20
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: CRITICAL
        - text: Status Not started Target
        - strong: 2026-11-20
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: CRITICAL. Status: Not started. Target date: 2026-11-20. Committed date: Not committed."
      - 'button "Open task: MW-I02 queue 1ed458fe 19"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 19
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: HIGH
        - text: Status Not started Target
        - strong: 2026-11-19
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: HIGH. Status: Not started. Target date: 2026-11-19. Committed date: Not committed."
      - 'button "Open task: MW-I02 queue 1ed458fe 18"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 18
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: MEDIUM
        - text: Status Not started Target
        - strong: 2026-11-18
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: MEDIUM. Status: Not started. Target date: 2026-11-18. Committed date: Not committed."
      - 'button "Open task: MW-I02 queue 1ed458fe 17"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 17
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: LOW
        - text: Status Not started Target
        - strong: 2026-11-17
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: LOW. Status: Not started. Target date: 2026-11-17. Committed date: Not committed."
      - 'button "Open task: MW-I02 queue 1ed458fe 16"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 16
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: CRITICAL
        - text: Status Not started Target
        - strong: 2026-11-16
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: CRITICAL. Status: Not started. Target date: 2026-11-16. Committed date: Not committed."
      - 'button "Open task: MW-I02 queue 1ed458fe 15"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 15
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: HIGH
        - text: Status Not started Target
        - strong: 2026-11-15
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: HIGH. Status: Not started. Target date: 2026-11-15. Committed date: Not committed."
      - 'button "Open task: MW-I02 queue 1ed458fe 14"':
        - text: Task
        - strong: MW-I02 queue 1ed458fe 14
        - text: No project People · Primary owner
        - strong: mw-i02-designer@example.test
        - text: Priority
        - strong: MEDIUM
        - text: Status Not started Target
        - strong: 2026-11-14
        - text: Committed
        - strong: Not committed
        - text: "Open task Primary owner: mw-i02-designer@example.test. Priority: MEDIUM. Status: Not started. Target date: 2026-11-14. Committed date: Not committed."
  - group: Open decisions · action queue
  - region "Work needing attention":
    - group:
      - text: Reviews awaiting you
      - strong: 0 items
    - group:
      - text: Your correction tasks
      - strong: 0 items
    - group:
      - text: "Management: employee-exit reassignment"
      - strong: 0 items
    - region "Client reviews":
      - heading "Client reviews" [level=2]
      - paragraph: Personal client-review totals are not available here. Open the project context to see reviews you are authorized to access.
      - link "Open project client reviews":
        - /url: /client-reviews
- contentinfo: Sense Studios · Secure workspace
```

# Test source

```ts
  743 | 
  744 |     // Prototype-matched authenticated My Work captures. These are actual
  745 |     // application views; only the separately named failure state below is simulated.
  746 |     const referenceWidths = [1440, 1024, 390, 320] as const;
  747 |     const capturePersona = async (page: Page, persona: string): Promise<void> => {
  748 |       await page.goto("/my-work");
  749 |       await expect(page.getByRole("heading", { name: "My work" })).toBeVisible();
  750 |       const totals = await api<{ total: number }>(page, "/api/v1/tasks?scope=personal&offset=0&limit=1", "GET");
  751 |       if (totals.total > 0) await expect(page.locator(".task-queue-row").first()).toBeVisible();
  752 |       else await expect(page.locator(".task-empty")).toBeVisible();
  753 |       for (const width of referenceWidths) await captureMyWorkReferencePair(page, testInfo, persona, "initial", width, { actualPersonalTaskTotal: totals.total, evidence: "authenticated application backed by the run database" });
  754 |     };
  755 |     await capturePersona(staff.leader.page, "leader");
  756 |     await capturePersona(staff.employee.page, "site");
  757 |     await capturePersona(ownerPage, "owner");
  758 | 
  759 |     const designerPage = staff.designer.page;
  760 |     await designerPage.goto("/my-work");
  761 |     await expect(designerPage.getByRole("heading", { name: "My work" })).toBeVisible();
  762 |     const baseTotals = await api<{ total: number }>(designerPage, "/api/v1/tasks?scope=personal&offset=0&limit=1", "GET");
  763 |     for (const width of referenceWidths) await captureMyWorkReferencePair(designerPage, testInfo, "designer", "initial", width, { actualPersonalTaskTotal: baseTotals.total, evidence: "authenticated application backed by the run database" });
  764 | 
  765 |     await designerPage.goto("/my-work");
  766 |     const waitingTotals = await api<{ total: number }>(designerPage, "/api/v1/tasks?scope=personal&phase=waiting&offset=0&limit=1", "GET");
  767 |     expect(waitingTotals.total, "the authenticated journey created an actual waiting personal task").toBeGreaterThan(0);
  768 |     const waitingWidget = designerPage.getByRole("button", { name: `Waiting personal tasks: ${waitingTotals.total}`, exact: true });
  769 |     await expect(waitingWidget).toBeVisible();
  770 |     await waitingWidget.click();
  771 |     await expect(designerPage.getByRole("status").filter({ hasText: `Showing ${waitingTotals.total} waiting personal tasks` })).toBeVisible();
  772 |     await expect(designerPage.getByRole("button", { name: new RegExp(`Open task: ${waitingTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) })).toBeVisible();
  773 |     for (const width of referenceWidths) await captureMyWorkReferencePair(designerPage, testInfo, "designer", "waiting-selected", width, { actualWaitingTotal: waitingTotals.total, evidence: "authenticated application backed by the run database" });
  774 | 
  775 |     await designerPage.goto("/my-work");
  776 |     const noMatch = `mw-i02-empty-${randomUUID()}`;
  777 |     const emptyResult = await api<{ total: number }>(designerPage, `/api/v1/tasks?scope=personal&offset=0&limit=1&q=${encodeURIComponent(noMatch)}`, "GET");
  778 |     expect(emptyResult.total, "the server confirms the unique search has no personal task match").toBe(0);
  779 |     const emptySearch = designerPage.getByRole("textbox", { name: "Search tasks" });
  780 |     await emptySearch.fill(noMatch);
  781 |     await designerPage.getByRole("button", { name: "Apply filters", exact: true }).click();
  782 |     await expect(designerPage.locator(".task-empty")).toContainText("No tasks are assigned to you");
  783 |     await expect(designerPage.getByText("0 filtered tasks", { exact: true })).toBeVisible();
  784 |     for (const width of referenceWidths) await captureMyWorkReferencePair(designerPage, testInfo, "designer", "empty", width, { serverConfirmedZeroMatch: true, searchToken: noMatch, evidence: "actual authenticated route and zero-result API response" });
  785 | 
  786 |     // Focused supplemental source-state checks. Each intercepted response is
  787 |     // explicitly labeled as controlled; authenticated session endpoints and
  788 |     // all unhandled task sources remain live against the run database.
  789 |     const supplementalActivePath = "/api/v1/tasks";
  790 |     const supplementalActiveTotal = (await api<{ total: number }>(designerPage, `${supplementalActivePath}?scope=personal&phase=active&offset=0&limit=1`, "GET")).total;
  791 |     await designerPage.goto("/my-work");
  792 |     const supplementalActiveTile = designerPage.getByRole("button", { name: `Active personal tasks: ${supplementalActiveTotal}`, exact: true });
  793 |     await expect(supplementalActiveTile).toBeVisible();
  794 |     await expect(designerPage.locator(".task-queue-row").first()).toBeVisible();
  795 |     const supplementalActiveArticle = designerPage.locator(".my-work-phase-summary__grid .my-work-phase").first();
  796 |     const supplementalQueue = designerPage.locator(".task-workspace nav.task-list");
  797 |     const supplementalQueueBefore = await designerPage.locator(".task-queue-row").count();
  798 |     let releaseSupplementalLoading: (() => void) | undefined;
  799 |     let signalSupplementalRoute: (() => void) | undefined;
  800 |     const supplementalRouteReached = new Promise<void>(resolveRoute => { signalSupplementalRoute = resolveRoute; });
  801 |     const supplementalRouteRelease = new Promise<void>(resolveRelease => { releaseSupplementalLoading = resolveRelease; });
  802 |     const supplementalActiveMatcher = (url: URL): boolean => url.pathname === supplementalActivePath && url.searchParams.get("scope") === "personal" && url.searchParams.get("phase") === "active" && url.searchParams.get("limit") === "1";
  803 |     try {
  804 |       await designerPage.route(url => supplementalActiveMatcher(url), async route => {
  805 |         signalSupplementalRoute?.();
  806 |         await supplementalRouteRelease;
  807 |         await route.continue();
  808 |       });
  809 |       await designerPage.locator(".task-toolbar").getByRole("button", { name: "Refresh", exact: true }).click();
  810 |       await supplementalRouteReached;
  811 |       await expect(supplementalActiveArticle.locator("strong")).toContainText("Loading");
  812 |       await designerPage.screenshot({ path: testInfo.outputPath("my-work-designer-active-count-loading-controlled-supplemental.png"), fullPage: false });
  813 |       releaseSupplementalLoading?.();
  814 |       await expect(designerPage.getByRole("button", { name: `Active personal tasks: ${supplementalActiveTotal}`, exact: true })).toBeVisible();
  815 |       await designerPage.unroute(url => supplementalActiveMatcher(url));
  816 | 
  817 |       let supplementalFailureAttempt = 0;
  818 |       await designerPage.route(url => supplementalActiveMatcher(url), async route => {
  819 |         supplementalFailureAttempt += 1;
  820 |         await route.fulfill({
  821 |           status: supplementalFailureAttempt === 1 ? 503 : 403,
  822 |           contentType: "application/json",
  823 |           body: JSON.stringify({ message: supplementalFailureAttempt === 1 ? "Controlled MW-I02 phase count 503 simulation" : "Controlled MW-I02 phase count 403 simulation" })
  824 |         });
  825 |       });
  826 |       await designerPage.locator(".task-toolbar").getByRole("button", { name: "Refresh", exact: true }).click();
  827 |       const supplementalStaleTile = designerPage.getByRole("button", { name: `Active personal tasks: Stale count ${supplementalActiveTotal}`, exact: true });
  828 |       await expect(supplementalStaleTile).toBeVisible();
  829 |       await expect(supplementalActiveArticle.locator(".my-work-phase__source-error[role=status]")).toContainText("Controlled MW-I02 phase count 503 simulation");
  830 |       await expect(supplementalQueue).toBeVisible();
  831 |       await expect(designerPage.locator(".task-queue-row")).toHaveCount(supplementalQueueBefore);
  832 |       const supplementalWorkingOtherPhase = designerPage.getByRole("button", { name: /^Waiting personal tasks: \d+$/ });
  833 |       await expect(supplementalWorkingOtherPhase).toBeVisible();
  834 |       const supplementalFailureLabel = await designerPage.addStyleTag({ content: "body::before{content:'CONTROLLED PHASE COUNT RESPONSE — supplemental acceptance capture';position:fixed;z-index:999999;top:8px;left:8px;padding:8px 12px;background:#8b1e2d;color:#fff;font:700 13px/1.3 system-ui,sans-serif;border-radius:4px;box-shadow:0 2px 8px #0005}" });
  835 |       await designerPage.screenshot({ path: testInfo.outputPath("my-work-designer-active-count-stale-controlled-supplemental.png"), fullPage: false });
  836 |       await supplementalActiveArticle.getByRole("button", { name: "Retry active count", exact: true }).click();
  837 |       await expect(supplementalActiveArticle.locator(".my-work-phase__source-error[role=status]")).toHaveText("Not available to this account.");
  838 |       await expect(supplementalActiveArticle.getByRole("button", { name: /^Active personal tasks: Not available$/ })).toBeVisible();
  839 |       await expect(supplementalActiveArticle.locator("strong")).toContainText("Not available");
  840 |       await designerPage.screenshot({ path: testInfo.outputPath("my-work-designer-active-count-denied-controlled-supplemental.png"), fullPage: false });
  841 |       await designerPage.unroute(url => supplementalActiveMatcher(url));
  842 |       await designerPage.locator(".task-toolbar").getByRole("button", { name: "Refresh", exact: true }).click();
> 843 |       await expect(designerPage.getByRole("button", { name: `Active personal tasks: ${supplementalActiveTotal}`, exact: true })).toBeVisible();
      |                                                                                                                                  ^ Error: expect(locator).toBeVisible() failed
  844 |       await expect(supplementalActiveArticle.locator(".my-work-phase__source-error")).toHaveCount(0);
  845 |       await supplementalFailureLabel.evaluate(element => element.remove());
  846 |       const supplementalActualRetry = await api<{ total: number }>(designerPage, `${supplementalActivePath}?scope=personal&phase=active&offset=0&limit=1`, "GET");
  847 |       expect(supplementalActualRetry.total, "the recovered phase count matches the actual authenticated API source").toBe(supplementalActiveTotal);
  848 |       await expect(designerPage.locator(".task-queue-row")).toHaveCount(supplementalQueueBefore);
  849 |     } finally {
  850 |       releaseSupplementalLoading?.();
  851 |       await designerPage.unroute(url => supplementalActiveMatcher(url)).catch(() => undefined);
  852 |       await designerPage.locator("head style").evaluateAll(styles => styles.filter(style => style.textContent?.includes("CONTROLLED PHASE COUNT RESPONSE")).forEach(style => style.remove()));
  853 |     }
  854 | 
  855 |     // Separate, explicitly simulated API failure. Auth/session endpoints and
  856 |     // the surrounding application remain real; no screenshot is labeled as a
  857 |     // real loaded or server-failure state.
  858 |     await designerPage.goto("/my-work");
  859 |     await designerPage.route(url => url.pathname.endsWith("/api/v1/tasks") && url.searchParams.get("scope") === "personal", route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Controlled MW-I02 acceptance failure simulation" }) }));
  860 |     await designerPage.reload();
  861 |     await expect(designerPage.locator(".task-error[role=alert]")).toContainText("Tasks could not be loaded. Try again.");
  862 |     const simulatedPhaseErrors = designerPage.locator(".my-work-phase__source-error[role=alert]");
  863 |     await expect(simulatedPhaseErrors).toHaveCount(4);
  864 |     for (let index = 0; index < 4; index += 1) await expect(simulatedPhaseErrors.nth(index)).toContainText("Controlled MW-I02 acceptance failure simulation");
  865 |     const simulationLabel = await designerPage.addStyleTag({ content: "body::before{content:'SIMULATED API FAILURE — supplemental capture';position:fixed;z-index:999999;top:8px;left:8px;padding:8px 12px;background:#8b1e2d;color:#fff;font:700 13px/1.3 system-ui,sans-serif;border-radius:4px;box-shadow:0 2px 8px #0005}" });
  866 |     for (const width of referenceWidths) await captureMyWorkReferencePair(designerPage, testInfo, "designer", "error-simulated", width, { simulated: true, interceptedRequest: "GET /api/v1/tasks?scope=personal → HTTP 503", evidence: "supplemental controlled client-side failure only; not a real server or whole-app loading failure" });
  867 |     await designerPage.unrouteAll({ behavior: "wait" });
  868 |     await simulationLabel.evaluate(element => element.remove());
  869 |     await designerPage.getByRole("button", { name: "Reload", exact: true }).click();
  870 |     await expect(designerPage.locator(".task-error[role=alert]")).toHaveCount(0);
  871 |     await expect(simulatedPhaseErrors).toHaveCount(0);
  872 |     await expect(designerPage.locator(".task-queue-row").first()).toBeVisible();
  873 | 
  874 |   } finally {
  875 |     // Use each app's normal logout control even when an earlier assertion fails.
  876 |     for (const context of [ownerContext, ...staffContexts]) {
  877 |       const page = context.pages()[0];
  878 |       if (!page || page.isClosed()) continue;
  879 |       try {
  880 |         if (context === ownerContext && ownerAuth) state.ownerCredentials = mergeCredentials(state.ownerCredentials, await exportCredentials(ownerAuth));
  881 |         else {
  882 |           for (const [key, auth] of staffAuthenticators) {
  883 |             if (auth.cdp) state.personas[key] = { ...state.personas[key], credentials: mergeCredentials(state.personas[key]?.credentials ?? [], await exportCredentials(auth)) };
  884 |           }
  885 |         }
  886 |         saveAuthState(statePath, state);
  887 |       } catch { /* Credential snapshots are best effort during failure cleanup; preserve prior durable state. */ }
  888 |       try {
  889 |         await page.goto("/workspace");
  890 |         const signOut = page.getByRole("button", { name: "Sign out", exact: true });
  891 |         if (await signOut.count()) await logOut(page);
  892 |       } catch { /* Preserve the primary test error while still closing the isolated browser context. */ }
  893 |     }
  894 |     await ownerContext.close();
  895 |     for (const context of staffContexts) await context.close();
  896 |   }
  897 | });
  898 | 
```