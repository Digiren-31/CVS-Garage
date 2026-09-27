/**
 * Projects integration adapter used by other backend domains.
 * Project records remain owned by the Projects module.
 */

import { projectsService } from '../modules/projects/projects.service.js';

export { PROJECT_SEEDS as MOCK_PROJECTS } from '../modules/projects/projects.store.js';

export class ProjectService {
  constructor(service = projectsService) {
    this.service = service;
  }

  async getProjectById(projectId) {
    return this.service.getProjectById(projectId);
  }

  async getAllProjects() {
    return this.service.getAllProjects();
  }

  async searchProjects(query = '') {
    return this.service.searchProjects(query);
  }
}

export const projectService = new ProjectService();
