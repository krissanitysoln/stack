import * as React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { GestureHandlerGestureEventNativeEvent } from 'react-native-gesture-handler';
import { TransitionProps, HeaderTransitionConfig } from '../../types';
declare type Props = {
    mode?: 'modal' | 'card';
    headerMode?: 'screen' | 'float' | 'none';
    headerLayoutPreset?: 'left' | 'center';
    headerTransitionPreset?: 'fade-in-place' | 'uikit';
    headerBackgroundTransitionPreset?: 'fade' | 'translate' | 'toggle';
    headerBackTitleVisible?: boolean;
    isLandscape: boolean;
    shadowEnabled?: boolean;
    cardOverlayEnabled?: boolean;
    transparentCard?: boolean;
    cardStyle?: StyleProp<ViewStyle>;
    transitionProps: TransitionProps;
    lastTransitionProps?: TransitionProps;
    transitionConfig?: (transitionProps: TransitionProps, prevTransitionProps?: TransitionProps, isModal?: boolean) => HeaderTransitionConfig;
    onGestureBegin?: () => void;
    onGestureEnd?: () => void;
    onGestureCanceled?: () => void;
    screenProps?: unknown;
    beforePanGestureStateChange?: (nativeEvent: GestureHandlerGestureEventNativeEvent) => boolean;
};
declare const _default: React.ComponentType<Pick<Props, "mode" | "headerMode" | "headerLayoutPreset" | "headerTransitionPreset" | "headerBackgroundTransitionPreset" | "headerBackTitleVisible" | "shadowEnabled" | "cardOverlayEnabled" | "transparentCard" | "cardStyle" | "transitionProps" | "lastTransitionProps" | "transitionConfig" | "onGestureBegin" | "onGestureEnd" | "onGestureCanceled" | "screenProps" | "beforePanGestureStateChange">>;
export default _default;