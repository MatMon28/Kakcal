import { startLaunchIntro } from './launchIntro';

/**
 * Side-effect module: import it in `main.tsx` BEFORE `./App`. ES modules run in import order, so the launch
 * animation is painted before the (large) app modules are evaluated and before React renders anything.
 */
startLaunchIntro();
