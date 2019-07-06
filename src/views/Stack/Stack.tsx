import * as React from 'react';
import {
  View,
  StyleSheet,
  LayoutChangeEvent,
  Dimensions,
  Platform,
  ViewProps,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { ScreenContainer, screensEnabled } from 'react-native-screens';
import { getDefaultHeaderHeight } from '../Header/HeaderSegment';
import { Props as HeaderContainerProps } from '../Header/HeaderContainer';
import StackItem from './StackItem';
import AnimatedScreen from './AnimatedScreen';
import {
  DefaultTransition,
  ModalTransition,
} from '../../TransitionConfigs/TransitionPresets';
import { forNoAnimation } from '../../TransitionConfigs/HeaderStyleInterpolators';
import {
  Route,
  Layout,
  HeaderMode,
  SceneDescriptor,
  NavigationProp,
  HeaderScene,
} from '../../types';

type ProgressValues = {
  [key: string]: Animated.Value<number>;
};

type Props = {
  mode: 'card' | 'modal';
  navigation: NavigationProp;
  descriptors: { [key: string]: SceneDescriptor };
  routes: Route[];
  openingRoutes: string[];
  closingRoutes: string[];
  onGoBack: (props: { route: Route }) => void;
  onOpenRoute: (props: { route: Route }) => void;
  onCloseRoute: (props: { route: Route }) => void;
  getPreviousRoute: (props: { route: Route }) => Route | undefined;
  getGesturesEnabled: (props: { route: Route }) => boolean;
  renderHeader: (props: HeaderContainerProps) => React.ReactNode;
  renderScene: (props: { route: Route }) => React.ReactNode;
  headerMode: HeaderMode;
  onTransitionStart?: (
    current: { index: number },
    previous: { index: number }
  ) => void;
  onGestureBegin?: () => void;
  onGestureCanceled?: () => void;
  onGestureEnd?: () => void;
};

type State = {
  routes: Route[];
  descriptors: { [key: string]: SceneDescriptor };
  scenes: HeaderScene<Route>[];
  progress: ProgressValues;
  layout: Layout;
  floatingHeaderHeights: { [key: string]: number };
};

const dimensions = Dimensions.get('window');
const layout = { width: dimensions.width, height: dimensions.height };

const MaybeScreenContainer = ({
  enabled,
  ...rest
}: ViewProps & {
  enabled: boolean;
  children: React.ReactNode;
}) => {
  if (Platform.OS !== 'ios' && enabled && screensEnabled()) {
    return <ScreenContainer {...rest} />;
  }

  return <View {...rest} />;
};

const MaybeScreen = ({
  enabled,
  next,
  ...rest
}: ViewProps & {
  enabled: boolean;
  next?: Animated.Node<number>;
  children: React.ReactNode;
}) => {
  if (Platform.OS !== 'ios' && enabled && screensEnabled()) {
    return <AnimatedScreen next={next} {...rest} />;
  }

  return <View {...rest} />;
};

const getFloatingHeaderHeights = (
  routes: Route[],
  layout: Layout,
  previous: { [key: string]: number }
) => {
  const defaultHeaderHeight = getDefaultHeaderHeight(layout);

  return routes.reduce(
    (acc, curr) => {
      acc[curr.key] = previous[curr.key] || defaultHeaderHeight;

      return acc;
    },
    {} as { [key: string]: number }
  );
};

export default class Stack extends React.Component<Props, State> {
  static getDerivedStateFromProps(props: Props, state: State) {
    if (
      props.routes === state.routes &&
      props.descriptors === state.descriptors
    ) {
      return null;
    }

    const progress = props.routes.reduce(
      (acc, curr) => {
        acc[curr.key] =
          state.progress[curr.key] ||
          new Animated.Value(
            props.openingRoutes.includes(curr.key) &&
            props.descriptors[curr.key].options.animationEnabled !== false
              ? 0
              : 1
          );

        return acc;
      },
      {} as ProgressValues
    );

    return {
      routes: props.routes,
      scenes: props.routes.map((route, index, self) => {
        const previousRoute = self[index - 1];
        const nextRoute = self[index + 1];

        const current = progress[route.key];
        const previous = previousRoute
          ? progress[previousRoute.key]
          : undefined;
        const next = nextRoute ? progress[nextRoute.key] : undefined;

        const scene = {
          route,
          previous: previousRoute,
          descriptor: props.descriptors[route.key],
          progress: {
            current,
            next,
            previous,
          },
        };

        const oldScene = state.scenes[index];

        if (
          oldScene &&
          scene.route === oldScene.route &&
          scene.progress.current === oldScene.progress.current &&
          scene.progress.next === oldScene.progress.next &&
          scene.progress.previous === oldScene.progress.previous &&
          scene.descriptor === oldScene.descriptor
        ) {
          return oldScene;
        }

        return scene;
      }),
      progress,
      descriptors: props.descriptors,
      floatingHeaderHeights: getFloatingHeaderHeights(
        props.routes,
        state.layout,
        state.floatingHeaderHeights
      ),
    };
  }

  state: State = {
    routes: [],
    scenes: [],
    progress: {},
    layout,
    descriptors: this.props.descriptors,
    // Used when card's header is null and mode is float to make transition
    // between screens with headers and those without headers smooth.
    // This is not a great heuristic here. We don't know synchronously
    // on mount what the header height is so we have just used the most
    // common cases here.
    floatingHeaderHeights: {},
  };

  private handleLayout = (e: LayoutChangeEvent) => {
    const { height, width } = e.nativeEvent.layout;

    if (
      height === this.state.layout.height &&
      width === this.state.layout.width
    ) {
      return;
    }

    const layout = { width, height };

    this.setState({
      layout,
      floatingHeaderHeights: getFloatingHeaderHeights(
        this.props.routes,
        layout,
        {}
      ),
    });
  };

  private handleFloatingHeaderLayout = ({
    route,
    height,
  }: {
    route: Route;
    height: number;
  }) => {
    const previousHeight = this.state.floatingHeaderHeights[route.key];

    if (previousHeight && previousHeight === height) {
      return;
    }

    this.setState(state => ({
      floatingHeaderHeights: {
        ...state.floatingHeaderHeights,
        [route.key]: height,
      },
    }));
  };

  private handleTransitionStart = ({
    route,
    current,
    previous,
  }: {
    route: Route;
    current: { index: number };
    previous: { index: number };
  }) => {
    const { onTransitionStart, descriptors } = this.props;
    const options = descriptors[route.key].options;

    onTransitionStart && onTransitionStart(current, previous);
    options.onTransitionStart && options.onTransitionStart();
  };

  private handleTransitionEnd = ({ route }: { route: Route }) => {
    const options = this.props.descriptors[route.key].options;
    options.onTransitionEnd && options.onTransitionEnd();
  };

  render() {
    const {
      mode,
      descriptors,
      navigation,
      routes,
      closingRoutes,
      onOpenRoute,
      onCloseRoute,
      onGoBack,
      getPreviousRoute,
      getGesturesEnabled,
      renderHeader,
      renderScene,
      headerMode,
      onGestureBegin,
      onGestureCanceled,
      onGestureEnd,
    } = this.props;

    const { scenes, layout, progress, floatingHeaderHeights } = this.state;

    const focusedRoute = navigation.state.routes[navigation.state.index];
    const focusedOptions = descriptors[focusedRoute.key].options;

    let defaultTransitionPreset =
      mode === 'modal' ? ModalTransition : DefaultTransition;

    if (headerMode === 'screen') {
      defaultTransitionPreset = {
        ...defaultTransitionPreset,
        headerStyleInterpolator: forNoAnimation,
      };
    }

    return (
      <React.Fragment>
        <MaybeScreenContainer
          enabled={mode !== 'modal'}
          style={styles.container}
          onLayout={this.handleLayout}
        >
          {routes.map((route, index, self) => {
            const focused = focusedRoute.key === route.key;
            const current = progress[route.key];
            const descriptor = descriptors[route.key];
            const scene = scenes[index];
            const next = self[index + 1]
              ? progress[self[index + 1].key]
              : undefined;

            const {
              header,
              headerTransparent,
              cardTransparent,
              cardShadowEnabled,
              cardOverlayEnabled,
              cardStyle,
              gestureResponseDistance,
              direction = defaultTransitionPreset.direction,
              transitionSpec = defaultTransitionPreset.transitionSpec,
              cardStyleInterpolator = defaultTransitionPreset.cardStyleInterpolator,
              headerStyleInterpolator = defaultTransitionPreset.headerStyleInterpolator,
            } = descriptor.options;

            return (
              <MaybeScreen
                key={route.key}
                style={StyleSheet.absoluteFill}
                enabled={mode !== 'modal'}
                next={next}
                pointerEvents="box-none"
              >
                <StackItem
                  index={index}
                  active={index === self.length - 1}
                  focused={focused}
                  closing={closingRoutes.includes(route.key)}
                  layout={layout}
                  current={current}
                  scene={scene}
                  previousScene={scenes[index - 1]}
                  navigation={navigation}
                  cardTransparent={cardTransparent}
                  cardOverlayEnabled={cardOverlayEnabled}
                  cardShadowEnabled={cardShadowEnabled}
                  cardStyle={cardStyle}
                  gesturesEnabled={index !== 0 && getGesturesEnabled({ route })}
                  onGestureBegin={onGestureBegin}
                  onGestureCanceled={onGestureCanceled}
                  onGestureEnd={onGestureEnd}
                  gestureResponseDistance={gestureResponseDistance}
                  floatingHeaderHeight={floatingHeaderHeights[route.key]}
                  hasCustomHeader={header === null}
                  getPreviousRoute={getPreviousRoute}
                  headerMode={headerMode}
                  headerTransparent={headerTransparent}
                  renderHeader={renderHeader}
                  renderScene={renderScene}
                  onOpenRoute={onOpenRoute}
                  onCloseRoute={onCloseRoute}
                  onTransitionStart={this.handleTransitionStart}
                  onTransitionEnd={this.handleTransitionEnd}
                  onGoBack={onGoBack}
                  direction={direction}
                  transitionSpec={transitionSpec}
                  cardStyleInterpolator={cardStyleInterpolator}
                  headerStyleInterpolator={headerStyleInterpolator}
                />
              </MaybeScreen>
            );
          })}
        </MaybeScreenContainer>
        {headerMode === 'float'
          ? renderHeader({
              mode: 'float',
              layout,
              scenes,
              navigation,
              getPreviousRoute,
              onContentHeightChange: this.handleFloatingHeaderLayout,
              styleInterpolator:
                focusedOptions.headerStyleInterpolator !== undefined
                  ? focusedOptions.headerStyleInterpolator
                  : defaultTransitionPreset.headerStyleInterpolator,
              style: styles.floating,
            })
          : null}
      </React.Fragment>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  floating: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
