import React, { Component } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import "./App.css";

export default class Proposal extends Component {
  render() {
    return(
      <div className="proposal">
        <p>Propoal ID: {this.props.id} Description: {this.props.description} Vote Count: {this.props.voterCount} </p>
      </div>
    );
  }
}
