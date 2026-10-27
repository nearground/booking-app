import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { Sequelize } = require('sequelize');

import sequelize from './database.js';
import User from './User.model.js';
import Organization from './Organization.model.js';
import Hotel from './Hotel.model.js';
import Location from './Location.model.js';
import Experience from './Experience.model.js';
import ScheduledExperience from './ScheduledExperience.model.js';
import Service from './Service.model.js';
import ScheduledService from './ScheduledService.model.js';
import ServiceReservation from './ServiceReservation.model.js';
import ExperienceReservation from './ExperienceReservation.model.js';
import ExperienceReservationAttendee from './ExperienceReservationAttendee.model.js';
import ExperienceReservationAttendeeAnswer from './ExperienceReservationAttendeeAnswer.model.js';
import ExperienceReservationAnswer from './ExperienceReservationAnswer.model.js';
import HotelReservation from './HotelReservation.model.js';
import Comment from './Comment.model.js';
import TicketTier from './TicketTier.model.js';
import Organizer from './Organizer.model.js';
import OrganizationInvite from './OrganizationInvite.model.js';
import PasswordReset from './PasswordReset.model.js';
import EmailVerificationToken from './EmailVerificationToken.model.js';
import ScheduleTemplate from './ScheduleTemplate.model.js';
import PickedOccurrence from './PickedOccurrence.model.js';
import Cart from './Cart.model.js';
import CartItem from './CartItem.model.js';
import Order from './Order.model.js';
import OrderItem from './OrderItem.model.js';

// Import models
// Associate new scheduling models

// Define all relationships here to avoid circular dependencies

// Experience relationships
Experience.belongsTo(Organization, { foreignKey: 'OrganizationId' });
Experience.belongsTo(Location, { foreignKey: 'LocationId' });
Experience.hasMany(ScheduledExperience, { as: 'ScheduledExperiences', foreignKey: 'ExperienceId' });
Experience.belongsToMany(User, {
  through: 'ExperienceOrganizers',
  as: 'Organizers',
  foreignKey: 'ExperienceId',
  otherKey: 'UserId',
});

Experience.hasMany(Comment, {
  foreignKey: 'CommentableId',
  constraints: false,
  scope: {
    CommentableType: 'Experience',
  },
});
Experience.hasMany(ScheduleTemplate, { foreignKey: 'ExperienceId' });
Experience.hasMany(PickedOccurrence, { foreignKey: 'ExperienceId' });

Organizer.hasMany(Comment, {
  foreignKey: 'CommentableId',
  constraints: false,
  scope: {
    CommentableType: 'Organizer',
  },
});

Experience.hasMany(TicketTier, { foreignKey: 'ExperienceId' });

// Service relationships
Service.belongsTo(Organization, { foreignKey: 'OrganizationId' });
Service.belongsTo(Location, { foreignKey: 'LocationId' });
Service.hasMany(ScheduledService, { as: 'ScheduledServices', foreignKey: 'ServiceId' });
Service.belongsToMany(User, {
  through: 'ServiceOrganizers',
  as: 'Organizers',
  foreignKey: 'ServiceId',
  otherKey: 'UserId',
});

// ExperienceReservation relationships
ExperienceReservation.belongsTo(User, { as: 'Customer' });
ExperienceReservation.belongsTo(ScheduledExperience, { foreignKey: 'ScheduledExperienceId' });
ExperienceReservation.hasMany(ExperienceReservationAttendee, {
  foreignKey: 'ExperienceReservationId',
  as: 'Attendees',
});
ExperienceReservation.hasMany(ExperienceReservationAnswer, {
  foreignKey: 'ExperienceReservationId',
  as: 'ReservationAnswers',
});

ExperienceReservationAttendee.belongsTo(ExperienceReservation, {
  foreignKey: 'ExperienceReservationId',
});
ExperienceReservationAttendee.belongsTo(TicketTier, {
  foreignKey: 'TicketTierId',
});
ExperienceReservationAttendee.hasMany(ExperienceReservationAttendeeAnswer, {
  foreignKey: 'ExperienceReservationAttendeeId',
  as: 'Answers',
});
ExperienceReservationAttendeeAnswer.belongsTo(ExperienceReservationAttendee, {
  foreignKey: 'ExperienceReservationAttendeeId',
});
ExperienceReservationAnswer.belongsTo(ExperienceReservation, {
  foreignKey: 'ExperienceReservationId',
});

// Hotel relationships
Hotel.belongsTo(Location);
Hotel.belongsTo(Organization);

Hotel.hasMany(Comment, {
  foreignKey: 'CommentableId',
  constraints: false,
  scope: {
    CommentableType: 'Hotel',
  },
});

// HotelReservation relationships
HotelReservation.belongsTo(User, { as: 'Customer' });
HotelReservation.belongsTo(Hotel);

// Location relationships
Location.hasMany(Hotel);
Location.hasMany(Experience, { as: 'Experiences', foreignKey: 'LocationId' });
Location.hasMany(Service, { as: 'Services', foreignKey: 'LocationId' });
Location.hasMany(Organization, { as: 'HeadquarteredOrganizations', foreignKey: 'LocationId' });
Location.belongsTo(Organization, { as: 'Organization', foreignKey: 'OrganizationId' });

// Organization relationships
Organization.hasMany(Experience, { as: 'Experiences', foreignKey: 'OrganizationId' });
Organization.hasMany(Service, { as: 'Services', foreignKey: 'OrganizationId' });
Organization.hasMany(Hotel);
Organization.hasMany(OrganizationInvite);
Organization.hasMany(Location, { as: 'Locations', foreignKey: 'OrganizationId' });

const OrganizationMembers = sequelize.define('OrganizationMembers', {
  isAdmin: { type: Sequelize.BOOLEAN, defaultValue: false },
});

Organization.belongsToMany(User, { through: OrganizationMembers, as: 'Member' });
Organization.belongsTo(Location, { foreignKey: 'LocationId' });
OrganizationMembers.belongsTo(User, { foreignKey: 'UserId' });
OrganizationMembers.belongsTo(Organization, { foreignKey: 'OrganizationId' });

// ScheduledExperience relationships
ScheduledExperience.belongsTo(Experience, { foreignKey: 'ExperienceId' });
ScheduledExperience.hasMany(ExperienceReservation, { foreignKey: 'ScheduledExperienceId' });
// Link sessions back to their source templates/picks
ScheduledExperience.belongsTo(ScheduleTemplate, { foreignKey: 'ScheduleTemplateId' });
ScheduledExperience.belongsTo(PickedOccurrence, { foreignKey: 'PickedOccurrenceId' });

// ScheduledService relationships
ScheduledService.belongsTo(Service, { foreignKey: 'ServiceId' });
ScheduledService.hasMany(ServiceReservation, { foreignKey: 'ScheduledServiceId' });

// ServiceReservation relationships
ServiceReservation.belongsTo(User, { as: 'Customer' });
ServiceReservation.belongsTo(ScheduledService, { foreignKey: 'ScheduledServiceId' });

// User relationships (many-to-many and one-to-many)
User.belongsToMany(Experience, {
  through: 'ExperienceOrganizers',
  as: 'OrganizedExperiences',
  foreignKey: 'UserId',
  otherKey: 'ExperienceId',
});
User.belongsToMany(Service, {
  through: 'ServiceOrganizers',
  as: 'OrganizedServices',
  foreignKey: 'UserId',
  otherKey: 'ServiceId',
});
User.hasMany(HotelReservation, { as: 'HotelReservations', foreignKey: 'CustomerId' });
User.hasMany(ExperienceReservation, { as: 'ExperienceReservations', foreignKey: 'CustomerId' });
User.hasMany(ServiceReservation, { as: 'ServiceReservations', foreignKey: 'CustomerId' });
User.belongsToMany(Organization, {
  through: OrganizationMembers,
  as: 'Organizations',
});
User.hasOne(Organizer, { foreignKey: 'UserId' });
User.hasMany(PasswordReset, { foreignKey: 'email', sourceKey: 'email', constraints: false });
PasswordReset.belongsTo(User, { foreignKey: 'email', targetKey: 'email', constraints: false });
User.hasMany(Experience, { as: 'Experiences', foreignKey: 'UserId' });
User.hasMany(Service, { as: 'Services', foreignKey: 'UserId' });
User.hasMany(Hotel);
User.hasMany(Comment);
User.hasMany(OrganizationInvite, { foreignKey: 'invitedByUserId' });

OrganizationInvite.belongsTo(Organization);
OrganizationInvite.belongsTo(User, { as: 'InvitedBy', foreignKey: 'invitedByUserId' });

Comment.belongsTo(User);
Comment.belongsTo(Hotel, { as: 'hotel', foreignKey: 'CommentableId', constraints: false, scope: { CommentableType: 'Hotel' } });
Comment.belongsTo(Experience, { as: 'experience', foreignKey: 'CommentableId', constraints: false, scope: { CommentableType: 'Experience' } });
Comment.hasMany(Comment, { as: 'replies', foreignKey: 'ParentId' });
Comment.belongsTo(Organizer, { as: 'organizer', foreignKey: 'CommentableId', constraints: false, scope: { CommentableType: 'Organizer' } });
// Comment.belongsTo(Comment, { as: 'Parent', foreignKey: 'ParentId' }); // This line is moved down to avoid circular dependency issues with getterMethods in Comment model
Comment.belongsTo(Comment, { as: 'parent', foreignKey: 'ParentId' });

TicketTier.belongsTo(Experience, { foreignKey: 'ExperienceId' });
TicketTier.hasMany(ExperienceReservationAttendee, {
  foreignKey: 'TicketTierId',
});

Organizer.belongsTo(User);

// Cart relationships
Cart.belongsTo(User, { as: 'Customer', foreignKey: 'CustomerId' });
User.hasMany(Cart, { as: 'Carts', foreignKey: 'CustomerId' });
Cart.hasMany(CartItem, { foreignKey: 'CartId', as: 'Items' });
CartItem.belongsTo(Cart, { foreignKey: 'CartId' });

// Order relationships
Order.belongsTo(User, { as: 'Customer', foreignKey: 'CustomerId' });
User.hasMany(Order, { as: 'Orders', foreignKey: 'CustomerId' });
Order.belongsTo(Cart, { foreignKey: 'CartId' });
Cart.hasOne(Order, { foreignKey: 'CartId' });
Order.hasMany(OrderItem, { foreignKey: 'OrderId', as: 'Items' });
OrderItem.belongsTo(Order, { foreignKey: 'OrderId' });

// OrderItem → reservation links
OrderItem.belongsTo(ExperienceReservation, { foreignKey: 'ExperienceReservationId', as: 'ExperienceReservation' });
OrderItem.belongsTo(ServiceReservation, { foreignKey: 'ServiceReservationId', as: 'ServiceReservation' });
OrderItem.belongsTo(HotelReservation, { foreignKey: 'HotelReservationId', as: 'HotelReservation' });
ExperienceReservation.hasOne(OrderItem, { foreignKey: 'ExperienceReservationId' });
ServiceReservation.hasOne(OrderItem, { foreignKey: 'ServiceReservationId' });
HotelReservation.hasOne(OrderItem, { foreignKey: 'HotelReservationId' });

const db = {
    sequelize,
    Sequelize,
};

// Add models to db object
db.Experience = Experience;
db.Service = Service;
db.ServiceReservation = ServiceReservation;
db.ExperienceReservation = ExperienceReservation;
db.ExperienceReservationAttendee = ExperienceReservationAttendee;
db.ExperienceReservationAttendeeAnswer = ExperienceReservationAttendeeAnswer;
db.ExperienceReservationAnswer = ExperienceReservationAnswer;
db.Hotel = Hotel;
db.HotelReservation = HotelReservation;
db.Location = Location;
db.Organization = Organization;
db.ScheduledExperience = ScheduledExperience;
db.ScheduleTemplate = ScheduleTemplate;
db.PickedOccurrence = PickedOccurrence;
db.ScheduledService = ScheduledService;
db.User = User;
db.Comment = Comment;
db.TicketTier = TicketTier;
db.Organizer = Organizer;
db.OrganizationInvite = OrganizationInvite;
db.PasswordReset = PasswordReset;
db.EmailVerificationToken = EmailVerificationToken;
db.OrganizationMembers = OrganizationMembers;
db.Cart = Cart;
db.CartItem = CartItem;
db.Order = Order;
db.OrderItem = OrderItem;

export {
  sequelize,
  Sequelize,
  Experience,
  Service,
  ServiceReservation,
  ExperienceReservation,
  ExperienceReservationAttendee,
  ExperienceReservationAttendeeAnswer,
  ExperienceReservationAnswer,
  Hotel,
  HotelReservation,
  Location,
  Organization,
  ScheduledExperience,
  ScheduleTemplate,
  PickedOccurrence,
  ScheduledService,
  User,
  Comment,
  TicketTier,
  Organizer,
  OrganizationInvite,
  PasswordReset,
  EmailVerificationToken,
  OrganizationMembers,
  Cart,
  CartItem,
  Order,
  OrderItem,
};

export default db;
