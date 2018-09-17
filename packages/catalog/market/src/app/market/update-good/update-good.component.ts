import {
  Component, ElementRef, EventEmitter, Inject, Input, OnChanges, OnInit,
  ViewChild, Output
} from '@angular/core';

import {
  AbstractControl, FormBuilder, FormControl, FormGroup, FormGroupDirective,
  Validators
} from '@angular/forms';

import {
  GatewayService, GatewayServiceFactory, OnAfterAbort, OnAfterCommit, OnRun,
  RunService
} from 'dv-core';

import { map } from 'rxjs/operators';

import * as _ from 'lodash';

import { API_PATH } from '../market.config';
import { Good } from '../shared/market.model';

interface UpdateGoodRes {
  data: { updateGood: boolean },
  errors: { message: string }[]
}

const SAVED_MSG_TIMEOUT = 3000;

@Component({
  selector: 'market-update-good',
  templateUrl: './update-good.component.html',
  styleUrls: ['./update-good.component.css'],
})
export class UpdateGoodComponent implements
  OnInit, OnChanges, OnRun, OnAfterCommit, OnAfterAbort, OnChanges {
  @Input() id: string;
  @Input() showSellerId: boolean = true;

  // optional input values to override form input values
  @Input() set price(price: number) {
    this.priceControl.setValue(price);
  }
  @Input() set supply(supply: number) {
    this.supplyControl.setValue(supply);
  }
  @Input() set sellerId(sellerId: string) {
    this.sellerIdControl.setValue(sellerId);
  }

  // Presentation inputs
  @Input() buttonLabel = 'Update';
  @Input() goodSavedText = 'Good saved';

  @ViewChild(FormGroupDirective) form;

  priceControl = new FormControl();
  supplyControl = new FormControl();
  sellerIdControl = new FormControl();
  updateGoodForm: FormGroup = this.builder.group({
    priceControl: this.priceControl,
    supplyControl: this.supplyControl,
    sellerIdControl: this.sellerIdControl
  });


  goodSaved = false;
  goodError: string;

  private gs: GatewayService;

  constructor(
    private elem: ElementRef, private gsf: GatewayServiceFactory,
    private rs: RunService, private builder: FormBuilder,
    @Inject(API_PATH) private apiPath) {}

  ngOnInit() {
    this.gs = this.gsf.for(this.elem);
    this.rs.register(this.elem, this);
    if (!this.sellerId) {
      this.sellerIdControl.clearValidators();
    }
    this.loadGood();
  }

  ngOnChanges() {
    this.loadGood();
  }

  loadGood() {
    if (!this.gs || !this.id) {
      return;
    }
    this.gs.get<{data: {good: Good}}>(this.apiPath, {
      params: {
        query: `
          query {
            good(id: "${this.id}") {
              id
              price
              supply
              seller { id }
            }
          }
        `
      }
    })
    .pipe(map((res) => res.data.good))
    .subscribe((good: Good) => {
      this.priceControl.setValue(good.price);
      this.supplyControl.setValue(good.supply);
      if (good.seller) {
        this.sellerIdControl.setValue(good.seller.id);
      }
    })
  }

  onSubmit() {
    this.rs.run(this.elem);
  }

  async dvOnRun(): Promise<void> {
    const res = await this.gs.post<UpdateGoodRes>('/graphql', {
      query: `mutation UpdateGood($input: UpdateGoodInput!) {
        updateGood (input: $input)
      }`,
      variables: {
        input: {
          id: this.id,
          price: this.priceControl.value,
          sellerId: this.sellerIdControl.value,
          supply: this.supplyControl.value
        }
      }
    })
    .toPromise();

    if (res.errors) {
      throw new Error(_.map(res.errors, 'message')
        .join());
    }
  }

  dvOnAfterCommit() {
    this.goodSaved = true;
    this.goodError = '';
    window.setTimeout(() => {
      this.goodSaved = false;
    }, SAVED_MSG_TIMEOUT);
    // Can't do `this.form.reset();`
    // See https://github.com/angular/material2/issues/4190
    if (this.form) {
      this.form.resetForm();
    }
  }

  dvOnAfterAbort(reason: Error) {
    this.goodError = reason.message;
  }
}