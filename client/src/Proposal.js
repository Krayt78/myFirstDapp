import React, { Component } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import "./App.css";

export default class Proposal extends Component {
  render() {
    return(
      <div className="proposal">
        <p>{this.props.id}</p>
        <p>{this.props.description}</p>
    </div>
    );
  }
}
