/**
 * Million Ether Game (https://www.decent.org)
 *
 * Copyright © 2017 DECENT All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */

import React, { Component, PropTypes } from 'react';
import withStyles from 'isomorphic-style-loader/lib/withStyles';
import s from './ErrorPage.scss';

const title = 'Error';

class ErrorPage extends Component {

  static contextTypes = {
    onSetTitle: PropTypes.func.isRequired,
    onPageNotFound: PropTypes.func.isRequired,
  };

  componentWillMount() {
    this.context.onSetTitle(title);
  }

  render() {
    return (
      <div>
        <h1>{title}</h1>
        <p>Sorry, an critical error occurred on this page.</p>
      </div>
    );
  }

}

export default withStyles(ErrorPage, s);
