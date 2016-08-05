///<reference path="../typings/socket.io/socket.io.d.ts"/>

import express = require('express');
import Promise = require('bluebird');
import fs = require('fs');
import soap = require('soap');
import {Inject} from "di-ts";
import {SocketNamespace} from "../websockets/SocketNamespace";
import {ApiAbstract} from "./ApiAbstract";
import {CronService} from "../services/CronService";
import {EVSEService} from "../services/EVSEService";
import Namespace = SocketIO.Namespace;
import {UserService} from "../services/UserService";
import {ParametersMissingError} from "../errors/ParametersMissingError";
import {BadRequestError} from "../errors/BadRequestError";
import {config} from "../config";
import {IApiRequest} from "../interfaces/IApiRequest";

@Inject
export class ApiV1 extends ApiAbstract {

  constructor(protected cronService: CronService,
              protected evseService: EVSEService,
              protected userService: UserService) {

    super();

    this.cronService.scheduleEvseDataImport();
    this.cronService.scheduleEvseStatusImport();

    this.evseService.initEVSEStates(this.evseStates);
  }

  // REST implementations
  // ===============================

  // User
  // -------------------------------

  createUser(req: express.Request, res: express.Response, next: any): void {

    var data = req.body;

    Promise.resolve()
      .then(() => {

        if (!((!data.evcoId && !data.password) ||
          (data.evcoId && data.password))) {

          throw new BadRequestError('Both evcoId and password should be provided ' +
            'or none of these parameters for creating an auto generated user')
        }

        if (!data.languageCode) {

          throw new ParametersMissingError(['languageCode']);
        }

      })
      .then(() => this.userService.register(data.languageCode, data.evcoId, data.password))
      .then((user) => res.json(user))
      .catch(next)
    ;
  }


  updateUser(req: IApiRequest, res: express.Response, next: any): void {

    var data = req.body;

    this.userService.update(req.user, data)
      .then(() => res.sendStatus(HttpStatus.OK))
      .catch(next)
    ;

  }

  authUser(req: express.Request, res: express.Response, next: any): void {

    var data = req.body;

    Promise.resolve()
      .then(() => {

        if (!data.code && !data.evcoId && !data.password) {

          throw new BadRequestError('Both evcoId and password should be provided ' +
            'or code')
        }
      })
      .then(() => this.userService.authenticate(data.evcoId || data.code, data.password))
      .then((user) => res.json(user))
      .catch(next)
    ;
  }

// EVSEs
// -------------------------------

  getEVSEs(req: express.Request, res: express.Response, next: any): void {

    Promise.resolve()
      .then(() => this.checkRequiredParameters(req.query, ['searchTerm']))
      .then(() => this.evseService.getEVSEBySearchTerm(req.query['searchTerm']))
      .then(evses => res.json(evses))
      .catch(next);
  }

  getEVSE(req: express.Request, res: express.Response, next: any): void {

    this.evseService.getEVSEById(req.params['id'])
      .then(evse => res.json(evse))
      .catch(next);
  }

// ChargingLocations
// -------------------------------

  getChargingLocationEVSEs(req: express.Request, res: express.Response, next: any): void {

    this.evseService.getEVSEsByChargingLocation(req.params['id'])
      .then(evse => res.json(evse))
      .catch(next);
  }

  getChargingLocation(req: express.Request, res: express.Response, next: any): void {

    this.evseService.getChargingLocationById(req.params['id'])
      .then(chargingLocation => res.json(chargingLocation))
      .catch(next);
  }

  getChargingLocations(req: express.Request, res: express.Response, next: any): void {

    Promise.resolve()
      .then(() => this.checkRequiredParameters(req.query, ['longitude1', 'latitude1', 'longitude2', 'latitude2', 'zoom']))
      .then(() => this.evseService.getChargingLocationsByCoordinates(
        parseFloat(req.query['longitude1']),
        parseFloat(req.query['latitude1']),
        parseFloat(req.query['longitude2']),
        parseFloat(req.query['latitude2']),
        parseInt(req.query['zoom'])
      ))
      .then(chargingLocations => res.json(chargingLocations))
      .catch(next)
    ;
  }

// Middleware implementations
// ===============================


  checkAuthentication(req: IApiRequest, res: express.Response, next: any): void {

    let rawToken = req.headers[config.request.accessTokenHeader];
    let match = config.request.authTokenRegex.exec(rawToken);
    let token;

    if (match && match.length > 1) {

      token = match[1];
    }

    if (!token) {

      res.sendStatus(HttpStatus.Unauthorized);
    }

    this.userService.checkAuthentication(token)
      .then((user) => {

        req.user = user;
        next();
      })
      .catch(next)
  }

// WebSocket namespaces
// ===============================

  @SocketNamespace
  evseStates: Namespace;

}
