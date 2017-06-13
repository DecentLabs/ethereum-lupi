/**
 * Million Ether Game (https://www.decent.org)
 *
 * Copyright © 2017 DECENT All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */

import React from 'react';
import withStyles from 'isomorphic-style-loader/lib/withStyles';
import s from './Header.scss';
import Link from '../Link';
import Navigation from '../Navigation';

function Header() {
  return (
    <div className={s.root}>
      <div className={s.container}>
        <Navigation className={s.nav} />
        <Link className={s.brand} to="/">
          <span className={s.brandTxt}></span>
        </Link>
        <div className={s.banner}>
          <h1 className={s.bannerTitle}>Million Ether Bet</h1>
          <p className={s.bannerDesc}></p>
        </div>
      </div>
    </div>
  );
}

export default withStyles(Header, s);
