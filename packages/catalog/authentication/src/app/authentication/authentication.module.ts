import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  MatButtonModule, MatFormFieldModule, MatInputModule,
  MatSelectModule
} from '@angular/material';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { DvModule } from 'dv-core';

import { AuthenticationService } from './shared/authentication.service';

import { AuthenticateComponent } from './authenticate/authenticate.component';
import {
  ChangePasswordComponent
} from './change-password/change-password.component';
export { ChangePasswordComponent };
import { LoggedInComponent } from './logged-in/logged-in.component';
export { LoggedInComponent };
import { RegisterUserComponent } from './register-user/register-user.component';
export { RegisterUserComponent };
import { ShowUserComponent } from './show-user/show-user.component';
export { ShowUserComponent };
import { SignInComponent } from './sign-in/sign-in.component';
export { SignInComponent };
import { SignOutComponent } from './sign-out/sign-out.component';
export { SignOutComponent };
import { ShowUsersComponent } from './show-users/show-users.component';

const allComponents = [
  AuthenticateComponent, ChangePasswordComponent, LoggedInComponent,
  RegisterUserComponent, ShowUserComponent, SignInComponent, SignOutComponent,
  ShowUsersComponent
];

@NgModule({
  imports: [
    BrowserAnimationsModule,
    CommonModule,
    DvModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule, MatInputModule, MatFormFieldModule, MatSelectModule
  ],
  providers: [AuthenticationService],
  declarations: allComponents,
  entryComponents: allComponents,
  exports: allComponents
})
export class AuthenticationModule { }
