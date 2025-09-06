import 'react-native-reanimated'; // первым делом
import './global.css';            // затем CSS NativeWind

import { registerRootComponent } from 'expo';
import App from './App';
registerRootComponent(App);