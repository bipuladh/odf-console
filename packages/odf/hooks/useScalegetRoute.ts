import { RouteKind, RouteModel, useK8sGet } from '@odf/shared';
import { IBM_SCALE_NAMESPACE } from '../constants';

const IBM_SCALE_GUI_ROUTE_NAME = 'ibm-spectrum-scale-gui';

export const useScaleGetRoute = () => {
  const [route] = useK8sGet<RouteKind>(
    RouteModel,
    IBM_SCALE_GUI_ROUTE_NAME,
    IBM_SCALE_NAMESPACE
  );
  return route?.spec?.host;
};
