/**
 * Million Ether Game (https://www.decent.org)
 *
 * Copyright © 2017 DECENT All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */

import createHistory from 'history/lib/createBrowserHistory';
import createMemoryHistory from 'history/lib/createMemoryHistory';
import useQueries from 'history/lib/useQueries';

const location = useQueries(process.env.BROWSER ? createHistory : createMemoryHistory)();

export default location;
