import { Project } from './decls.ts';

const proj: Project = {
    name: 'my_project',
    path: 'bla/blub',
    targets: [
        {
            name: 'test_target',
            type: 'exe',
            include_directories: [ { public: [ 'bla', 'blub', ]} ],
        }
    ]
}