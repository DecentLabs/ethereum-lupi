/**
 * Million Ether Game (https://www.decent.org)
 *
 * Copyright © 2017 DECENT All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */

import React from 'react';
import Register from './Register';

export const path = '/register';
export const action = async (state) => {
  const title = 'New User Registration';
  state.context.onSetTitle(title);
  return <Register title={title} />;
};
