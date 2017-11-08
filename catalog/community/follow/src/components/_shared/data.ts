import {Atom} from "client-bus";

import {Follower, Publisher, Message} from "../../_shared/data";
export interface Follower extends Follower {}
export interface Publisher extends Publisher {}
export interface Message extends Message {}

export interface FollowerAtom extends Follower, Atom {
  follows: PublisherAtom[];
}

export interface PublisherAtom extends Publisher, Atom {
  messages: MessageAtom[];
}

export interface MessageAtom extends Message, Atom {}