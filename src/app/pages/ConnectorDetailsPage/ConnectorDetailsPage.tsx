import { getConnector, getConnectorTypeDetail } from '@apis/api';
import { ConnectorStatus } from '@app/components/ConnectorStatus/ConnectorStatus';
import { Loading } from '@app/components/Loading/Loading';
import { CONNECTOR_DETAILS_TABS } from '@constants/constants';
import { useCos } from '@context/CosContext';
import React, { FC, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useHistory, useLocation, useParams } from 'react-router-dom';

import {
  PageSection,
  Breadcrumb,
  BreadcrumbItem,
  Level,
  Tab,
  Tabs,
  TabTitleText,
  LevelItem,
  Title,
  PageSectionVariants,
  AlertVariant,
} from '@patternfly/react-core';

import { useAlert } from '@rhoas/app-services-ui-shared';
import { Connector, ConnectorType } from '@rhoas/connector-management-sdk';

import { ConfigurationPage } from './ConfigurationPage';
import { OverviewPage } from './OverviewPage';

export interface ParamTypes {
  id: string;
}
const getTab = (hash: string): string => {
  return hash.includes('&')
    ? hash.substr(1, hash.indexOf('&') - 1)
    : hash.substr(1);
};

type ConnectorDetailsPageProps = {
  onSave: () => void;
};

export const ConnectorDetailsPage: FC<ConnectorDetailsPageProps> = ({
  onSave,
}) => {
  let { id } = useParams<ParamTypes>();
  let { hash } = useLocation();
  const history = useHistory();

  const alert = useAlert();
  const { t } = useTranslation();

  const { connectorsApiBasePath, getToken } = useCos();

  const [activeTabKey, setActiveTabKey] = useState<string | number>(
    getTab(hash)
  );
  const [editMode, setEditMode] = useState<boolean>();

  const [connectorData, setConnectorData] = useState<Connector>();
  const [connectorTypeDetails, setConnectorTypeDetails] =
    useState<ConnectorType>();

  const getConnectorData = useCallback((data) => {
    setConnectorData(data as Connector);
  }, []);

  const getConnectorTypeInfo = useCallback((data) => {
    setConnectorTypeDetails(data as ConnectorType);
  }, []);

  const updateEditMode = useCallback(
    (editEnable: boolean) => {
      setEditMode(editEnable);
    },
    [setEditMode]
  );

  const onError = useCallback(
    (description: string) => {
      alert?.addAlert({
        id: 'connector-details-page',
        variant: AlertVariant.danger,
        title: t('somethingWentWrong'),
        description,
      });
    },
    [alert, t]
  );

  useEffect(() => {
    if (hash.includes(CONNECTOR_DETAILS_TABS.Configuration)) {
      setEditMode(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    getConnector({
      accessToken: getToken,
      connectorsApiBasePath: connectorsApiBasePath,
      connectorId: id,
    })(getConnectorData, onError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    setActiveTabKey(getTab(hash));
  }, [hash]);

  useEffect(() => {
    if (connectorData?.connector_type_id) {
      getConnectorTypeDetail({
        accessToken: getToken,
        connectorsApiBasePath: connectorsApiBasePath,
        connectorTypeId: connectorData?.connector_type_id,
      })(getConnectorTypeInfo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectorData]);

  // Toggle currently active tab
  const handleTabClick = (
    _event: React.MouseEvent<HTMLElement, MouseEvent>,
    tabIndex: string | number
  ) => {
    setActiveTabKey(tabIndex);
    history.push(`#${tabIndex}`);
  };

  return (
    <>
      {!connectorData && <Loading />}
      {connectorData && (
        <>
          <ConnectorDetailsHeader connectorData={connectorData} />
          <PageSection
            padding={{ default: 'noPadding' }}
            style={{ zIndex: 0 }}
            variant={PageSectionVariants.light}
          >
            <Tabs
              activeKey={activeTabKey}
              onSelect={handleTabClick}
              className="connector_detail-tabs"
            >
              <Tab
                eventKey={CONNECTOR_DETAILS_TABS.Overview}
                title={<TabTitleText>{t('overview')}</TabTitleText>}
              >
                <OverviewPage connectorData={connectorData} />
              </Tab>
              <Tab
                eventKey={CONNECTOR_DETAILS_TABS.Configuration}
                title={<TabTitleText>{t('configuration')}</TabTitleText>}
              >
                {connectorTypeDetails ? (
                  <ConfigurationPage
                    onSave={onSave}
                    editMode={editMode || false}
                    updateEditMode={updateEditMode}
                    connectorData={connectorData}
                    connectorTypeDetails={connectorTypeDetails}
                  />
                ) : (
                  <Loading />
                )}
              </Tab>
            </Tabs>
          </PageSection>
        </>
      )}
    </>
  );
};

export type ConnectorDetailsHeaderProps = {
  connectorData: Connector;
};

export const ConnectorDetailsHeader: FC<ConnectorDetailsHeaderProps> = ({
  connectorData,
}) => {
  const { t } = useTranslation();

  // const [isOpen, setIsOpen] = useState<boolean>(false);

  // const onToggle = (isOpen: boolean) => {
  //   setIsOpen(isOpen);
  // };
  // const onSelect = (
  //   _event?: SyntheticEvent<HTMLDivElement, Event> | undefined
  // ) => {
  //   setIsOpen(!isOpen);
  //   onFocus();
  // };
  // const onFocus = () => {
  //   const element = document.getElementById('connector-action');
  //   element?.focus();
  // };

  // const dropdownItems = [
  //   <DropdownItem key="start action" component="button" onClick={() => {}}>
  //     {t('Start')}
  //   </DropdownItem>,
  //   <DropdownItem key="stop action" component="button" onClick={() => {}}>
  //     {t('Stop')}
  //   </DropdownItem>,
  //   <DropdownItem
  //     key="delete action"
  //     component="button"
  //     isDisabled
  //     onClick={() => {}}
  //   >
  //     {t('Delete')}
  //   </DropdownItem>,
  // ];

  return (
    <PageSection variant={'light'}>
      <Breadcrumb>
        <BreadcrumbItem>
          <Link to={'/'}>{t('connectorsInstances')}</Link>
        </BreadcrumbItem>
        <BreadcrumbItem isActive>{connectorData?.name}</BreadcrumbItem>
      </Breadcrumb>
      <Level className={'pf-u-pt-md pf-u-pb-md'}>
        <LevelItem>
          <Level>
            <Title headingLevel="h1" className={'pf-u-pr-md'}>
              {connectorData?.name}
            </Title>
            <ConnectorStatus
              desiredState={connectorData?.desired_state!}
              name={connectorData?.name!}
              state={connectorData?.status?.state!}
            />
          </Level>
        </LevelItem>
        <LevelItem>
          {/* 
          @TODO: This will be brought back 
          <Dropdown
            onSelect={onSelect}
            toggle={<KebabToggle onToggle={onToggle} id="connector-action" />}
            isOpen={isOpen}
            isPlain
            dropdownItems={dropdownItems}
            position={DropdownPosition.right}
          /> */}
        </LevelItem>
      </Level>
    </PageSection>
  );
};
