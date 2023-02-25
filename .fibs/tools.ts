import { ninja } from './tools/ninja.ts';
import { cmake } from './tools/cmake.ts';
import { git } from './tools/git.ts';

export const tools = {
  [git.name]: git,
  [cmake.name]: cmake,
  [ninja.name]: ninja,
}
