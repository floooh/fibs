# Writing Build Scripts

TODO:

- anatomy of a fibs.ts file
- configure function
  - adding imports
  - import options (also explain overload and when it runs!)
  - what information is available in the configure function
  - for adding other items, refer to their detailed doc pages
- build function
  - setting the project name
  - adding targets (also via TargetBuilder overload)
    - interface targets
    - explain target dependencies and scopes
    - frameworks vs libraries vs dependencies
    - build jobs
  - global build options
    - include directories
    - compile definitions
    - compile options
    - link options