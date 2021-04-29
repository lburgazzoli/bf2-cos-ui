/* eslint-disable camelcase */
/* eslint-disable no-undef */
import { ComponentType, LazyExoticComponent } from 'react';
import { ConnectorType } from '@cos-ui/api';
import {
  ConnectorConfiguratorResponse,
  makeFetchMachine,
} from '@cos-ui/machines';
import { interpret } from 'xstate';

type FederatedModuleConfigurationType = {
  remoteEntry: string;
  scope: string;
  module: string;
};

export type FederatedConfiguratorConfig = {
  steps: string[];
  Configurator: LazyExoticComponent<ComponentType<any>>;
};
type FederatedConfigurationConfigModule = {
  default: FederatedConfiguratorConfig;
};

export const fetchConfigurator = async (
  connector: ConnectorType,
  configUrl: string
): Promise<ConnectorConfiguratorResponse> => {
  const defaultConfig = Promise.resolve<ConnectorConfiguratorResponse>({
    steps: false,
    Configurator: false,
  });
  return new Promise(resolve => {
    interpret(
      makeFetchMachine<FederatedModuleConfigurationType>().withConfig({
        services: {
          fetchService: () =>
            fetchFederatedModulesConfiguration(configUrl, connector),
        },
      })
    )
      .onDone(async event => {
        try {
          await injectFederatedModuleScript(event.data.remoteEntry as string);
          resolve(
            loadFederatedConfigurator(event.data.scope, event.data.module)
          );
        } catch (e) {
          resolve(defaultConfig);
        }
      })
      .start();
  });
};

const isValidConf = (maybeConf?: any) =>
  maybeConf &&
  maybeConf.remoteEntry &&
  typeof maybeConf.remoteEntry === 'string' &&
  maybeConf.scope &&
  typeof maybeConf.scope === 'string' &&
  maybeConf.module &&
  typeof maybeConf.module === 'string';

const fetchFederatedModulesConfiguration = async (
  configUrl: string,
  connector: ConnectorType
): Promise<FederatedModuleConfigurationType> => {
  const config = await (await fetch(configUrl)).json();
  console.log('Fetched federated configurator remotes configuration', config);
  const maybeConfiguration = config[connector.id!];
  console.log(
    `Candidate configuration for "${connector.id}"`,
    maybeConfiguration
  );
  if (!maybeConfiguration) {
    console.log("Couldn't find any configuration for the requested connector");
    return Promise.reject();
  }
  if (isValidConf(maybeConfiguration[connector.version])) {
    const conf = maybeConfiguration[connector.version];
    console.log(
      `Found a configuration for connector version "${connector.version}"`,
      conf
    );
    return conf;
  }
  if (isValidConf(maybeConfiguration)) {
    console.log(
      'Found a generic configuration for the connector',
      maybeConfiguration
    );
    return maybeConfiguration;
  }
  console.log(
    "Couldn't find a valid configuration for the requested connector"
  );
  return Promise.reject();
};

export const injectFederatedModuleScript = async (url: string) => {
  return new Promise<void>((resolve, reject) => {
    const element = document.createElement('script');

    element.src = url;
    element.type = 'text/javascript';
    element.async = true;

    element.onload = () => {
      console.log(`Dynamic federated module loaded: ${url}`);
      document.head.removeChild(element);
      resolve();
    };

    element.onerror = () => {
      console.error(`Dynamic federated module Error: ${url}`);
      console.log(`Dynamic federated module Removed: ${url}`);
      document.head.removeChild(element);
      reject();
    };

    document.head.appendChild(element);
  });
};

export async function loadFederatedConfigurator(
  scope: string,
  module: string
): Promise<FederatedConfiguratorConfig> {
  // Initializes the share scope. This fills it with known provided modules from this build and all remotes
  await __webpack_init_sharing__('default');
  const container = (window as any)[scope]; // or get the container somewhere else
  // Initialize the container, it may provide shared modules
  await container.init(__webpack_share_scopes__.default);
  const factory = await (window as any)[scope].get(module);
  const federatedConfigurationConfig = factory() as FederatedConfigurationConfigModule;
  console.log(
    `loaded federated configurator configuration from ${scope}`,
    federatedConfigurationConfig
  );
  return federatedConfigurationConfig.default;
}
