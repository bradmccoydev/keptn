import ProjectSettingsPage from '../support/pageobjects/ProjectSettingsPage';
import { IProject } from '../../shared/interfaces/project';
import BasePage from '../support/pageobjects/BasePage';
import { interceptFailedMetadata } from '../support/intercept';
import { ProjectBoardPage } from '../support/pageobjects/ProjectBoardPage';

describe('Git upstream extended settings project https test', () => {
  const projectSettingsPage = new ProjectSettingsPage();

  it('should select HTTPS and fill out inputs', () => {
    const project: IProject = {
      projectName: 'sockshop',
      stages: [],
      gitCredentials: {
        user: 'myGitUser',
        remoteURL: 'https://myGitURL.com',
        https: {
          insecureSkipTLS: true,
          token: '',
          proxy: {
            scheme: 'https',
            url: 'myProxyUrl:5000',
            user: 'myProxyUser',
          },
        },
      },
      shipyardVersion: '0.14',
      creationDate: '',
      shipyard: '',
    };

    projectSettingsPage
      .interceptSettings()
      .interceptProject(project)
      .visitSettings('sockshop')
      .assertGitUsername('myGitUser')
      .assertGitUrl('https://myGitURL.com')
      .assertHttpsFormVisible(true)
      .assertProxyEnabled(true)
      .assertProxyFormVisible(true)
      .assertProxyScheme('HTTPS')
      .assertProxyInsecure(true)
      .assertProxyUsername('myProxyUser')
      .assertProxyUrl('myProxyUrl')
      .assertProxyPort(5000);
  });

  it('should submit https form and show notification', () => {
    const basePage = new BasePage();
    const project: IProject = {
      projectName: 'sockshop',
      stages: [],
      gitCredentials: {
        user: 'myGitUser',
        remoteURL: 'https://myGitURL.com',
      },
      shipyardVersion: '0.14',
      creationDate: '',
      shipyard: '',
    };

    projectSettingsPage
      .interceptSettings()
      .interceptProject(project)
      .visitSettings('sockshop')
      .typeGitToken('myToken')
      .updateProject();
    basePage.notificationSuccessVisible('The Git upstream was changed successfully.');
  });

  it('should prevent data loss if git credentials are not saved before navigation', () => {
    const basePage = new BasePage();
    const projectBoardPage = new ProjectBoardPage();
    const project: IProject = {
      projectName: 'sockshop',
      stages: [],
      gitCredentials: {
        user: 'myGitUser',
        remoteURL: 'https://myGitURL.com',
      },
      shipyardVersion: '0.14',
      creationDate: '',
      shipyard: '',
    };

    projectSettingsPage.interceptSettings().interceptProject(project).visitSettings('sockshop').typeGitToken('myToken');
    projectBoardPage.goToServicesPage();
    projectSettingsPage.clickSaveChangesPopup();
    basePage.notificationSuccessVisible('The Git upstream was changed successfully.');
  });

  it('should submit ssh form and show notification', () => {
    const basePage = new BasePage();
    const project: IProject = {
      projectName: 'sockshop',
      stages: [],
      gitCredentials: {
        user: 'myGitUser',
        remoteURL: 'ssh://myGitURL.com',
      },
      shipyardVersion: '0.14',
      creationDate: '',
      shipyard: '',
    };

    projectSettingsPage
      .interceptSettings()
      .interceptProject(project)
      .visitSettings('sockshop')
      .typeValidSshPrivateKey()
      .updateProject();
    basePage.notificationSuccessVisible('The Git upstream was changed successfully.');
  });

  it('should select SSH', () => {
    const project: IProject = {
      projectName: 'sockshop',
      stages: [],
      gitCredentials: {
        user: 'myGitUser',
        remoteURL: 'ssh://myGitURL.com',
      },
      shipyardVersion: '0.14',
      creationDate: '',
      shipyard: '',
    };

    projectSettingsPage
      .interceptSettings()
      .interceptProject(project)
      .visitSettings('sockshop')
      .assertSshFormVisible(true)
      .assertGitUsernameSsh('myGitUser');
  });

  it('should show "Set Git upstream" button', () => {
    projectSettingsPage.assertUpdateButtonExists(true);
  });
});

describe('Project settings with invalid metadata', () => {
  const projectSettingsPage = new ProjectSettingsPage();
  it('should show error if metadata endpoint does not return data', () => {
    const project: IProject = {
      projectName: 'sockshop',
      stages: [],
      gitCredentials: {
        user: 'myGitUser',
        remoteURL: 'ssh://myGitURL.com',
      },
      shipyardVersion: '0.14',
      creationDate: '',
      shipyard: '',
    };

    projectSettingsPage.interceptSettings().interceptProject(project);
    interceptFailedMetadata();
    projectSettingsPage.visitSettings('sockshop').assertErrorVisible(true);
  });
});

describe('Project settings with automatic provisioning', () => {
  const projectSettingsPage = new ProjectSettingsPage();

  it('should select NO_UPSTREAM when creating a project', () => {
    projectSettingsPage.interceptSettings(true).visit();
    projectSettingsPage.assertNoUpstreamSelected(true);
  });

  it('should select HTTPS when editing a project', () => {
    const project: IProject = {
      projectName: 'sockshop',
      stages: [],
      gitCredentials: {
        https: { insecureSkipTLS: false, token: '' },
        remoteURL: 'http://gitea-http.gitea-ns:3000/keptn/gitea-allocate-project-pls.git',
        user: 'keptn',
      },
      shipyardVersion: '0.14',
      creationDate: '',
      shipyard: '',
    };

    projectSettingsPage.interceptSettings(true).interceptProject(project);
    projectSettingsPage
      .visitSettings('sockshop')
      .assertHttpsSelected(true)
      .assertHttpsFormExists(true)
      .assertHttpsFormVisible(true);
  });
});
