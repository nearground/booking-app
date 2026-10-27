'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Users', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      firstName: { type: Sequelize.STRING, allowNull: true },
      lastName: { type: Sequelize.STRING, allowNull: true },
      email: { type: Sequelize.STRING, allowNull: false, unique: true },
      password: { type: Sequelize.STRING, allowNull: true },
      phoneNumber: { type: Sequelize.STRING, allowNull: true },
      dateOfBirth: { type: Sequelize.DATEONLY, allowNull: true },
      city: { type: Sequelize.STRING, allowNull: true },
      country: { type: Sequelize.STRING, allowNull: true },
      isPhoneVerified: { type: Sequelize.BOOLEAN, defaultValue: false },
      isEmailVerified: { type: Sequelize.BOOLEAN, defaultValue: false },
      profilePicture: { type: Sequelize.STRING, allowNull: true },
      isRegistered: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('EmailVerificationTokens', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      email: { type: Sequelize.STRING, allowNull: false },
      tokenHash: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      expiresAt: { type: Sequelize.DATE, allowNull: false },
      usedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('EmailVerificationTokens', ['email'], { name: 'idx_email_verification_tokens_email' });

    await queryInterface.createTable('Locations', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      name: { type: Sequelize.STRING, allowNull: false },
      coordinates: { type: Sequelize.GEOMETRY('POINT'), allowNull: false },
      country: { type: Sequelize.STRING, allowNull: false },
      state: { type: Sequelize.STRING, allowNull: false },
      city: { type: Sequelize.STRING, allowNull: false },
      street: { type: Sequelize.STRING, allowNull: false },
      zipCode: { type: Sequelize.STRING, allowNull: false },
      timezone: { type: Sequelize.STRING, allowNull: false, defaultValue: 'UTC' },
      OrganizationId: { type: Sequelize.INTEGER, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('Locations', ['city'], { name: 'idx_location_city' });
    await queryInterface.addIndex('Locations', ['country'], { name: 'idx_location_country' });
    await queryInterface.addIndex('Locations', ['OrganizationId'], { name: 'idx_location_organization' });
    await queryInterface.addIndex('Locations', ['coordinates'], { name: 'idx_location_coordinates', type: 'SPATIAL' });

    await queryInterface.createTable('Organizations', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      name: { type: Sequelize.STRING, allowNull: false, unique: true },
      email: { type: Sequelize.STRING, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
      LocationId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Locations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
    });

    await queryInterface.addConstraint('Locations', {
      fields: ['OrganizationId'],
      type: 'foreign key',
      name: 'fk_locations_organization',
      references: { table: 'Organizations', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addIndex('Locations', ['OrganizationId', 'name'], {
      unique: true,
      name: 'idx_location_org_name',
    });

    await queryInterface.createTable('Organizers', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      UserId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      description: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('Experiences', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      capacity: { type: Sequelize.INTEGER, allowNull: false },
      title: { type: Sequelize.STRING, allowNull: false },
      duration: { type: Sequelize.INTEGER, allowNull: true },
      scheduling: { type: Sequelize.STRING, allowNull: true },
      subtitle: { type: Sequelize.TEXT, allowNull: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      ratings: { type: Sequelize.DECIMAL(3, 2), allowNull: true },
      commentsCount: { type: Sequelize.INTEGER, allowNull: true },
      images: { type: Sequelize.JSON, allowNull: true },
      thumbnail: { type: Sequelize.STRING, allowNull: true },
      userQuestionnary: { type: Sequelize.JSON, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
      OrganizationId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Organizations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      LocationId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Locations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      UserId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
    });

    await queryInterface.addIndex('Experiences', ['LocationId'], { name: 'idx_experience_location' });

    await queryInterface.createTable('ScheduledExperiences', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      dateTime: { type: Sequelize.DATE, allowNull: false },
      endDateTime: { type: Sequelize.DATE, allowNull: true },
      capacity: { type: Sequelize.INTEGER, allowNull: false },
      availableSpots: { type: Sequelize.INTEGER, allowNull: false },
      status: {
        type: Sequelize.ENUM('waitlisted', 'scheduled', 'in-progress', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'waitlisted',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
      ExperienceId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Experiences', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
    });

    await queryInterface.createTable('TicketTiers', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      price: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      title: { type: Sequelize.STRING, allowNull: true },
      description: { type: Sequelize.STRING, allowNull: true },
      userQuestionnary: { type: Sequelize.JSON, allowNull: true },
      minAge: { type: Sequelize.INTEGER, allowNull: false },
      maxAge: { type: Sequelize.INTEGER, allowNull: true },
      maxTickets: { type: Sequelize.INTEGER, allowNull: true },
      idType: { type: Sequelize.STRING, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
      ExperienceId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Experiences', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
    });

    await queryInterface.createTable('ExperienceReservations', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      confirmationCode: { type: Sequelize.STRING, allowNull: false, unique: true },
      numberOfAttendees: { type: Sequelize.INTEGER, allowNull: false },
      totalPrice: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      status: {
        type: Sequelize.ENUM('pending', 'confirmed', 'attended', 'no-show', 'cancelled'),
        allowNull: false,
        defaultValue: 'confirmed',
      },
      specialRequests: { type: Sequelize.TEXT, allowNull: true },
      dayOfPhone: { type: Sequelize.STRING, allowNull: true },
      hotelName: { type: Sequelize.STRING, allowNull: true },
      comments: { type: Sequelize.STRING, allowNull: true },
      billingEmail: { type: Sequelize.STRING, allowNull: false },
      billingName: { type: Sequelize.STRING, allowNull: false },
      billingAddress: { type: Sequelize.STRING, allowNull: false },
      billingCity: { type: Sequelize.STRING, allowNull: false },
      billingState: { type: Sequelize.STRING, allowNull: false },
      billingPostalCode: { type: Sequelize.STRING, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
      CustomerId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      ScheduledExperienceId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'ScheduledExperiences', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
    });

    await queryInterface.createTable('ExperienceReservationAttendees', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      status: { type: Sequelize.ENUM('active', 'cancelled'), allowNull: false, defaultValue: 'active' },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
      ExperienceReservationId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'ExperienceReservations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      TicketTierId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'TicketTiers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
    });

    await queryInterface.addIndex('ExperienceReservationAttendees', ['ExperienceReservationId'], {
      name: 'idx_experience_reservation_attendees_reservation_id',
    });
    await queryInterface.addIndex('ExperienceReservationAttendees', ['TicketTierId'], {
      name: 'idx_experience_reservation_attendees_ticket_tier_id',
    });

    await queryInterface.createTable('ExperienceReservationAttendeeAnswers', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      questionKey: { type: Sequelize.STRING, allowNull: false },
      answerText: { type: Sequelize.TEXT, allowNull: true },
      answerJson: { type: Sequelize.JSON, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
      ExperienceReservationAttendeeId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'ExperienceReservationAttendees', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
    });
    await queryInterface.addConstraint('ExperienceReservationAttendeeAnswers', {
      fields: ['ExperienceReservationAttendeeId', 'questionKey'],
      type: 'unique',
      name: 'unique_attendee_answer_per_question',
    });
    await queryInterface.addIndex('ExperienceReservationAttendeeAnswers', ['ExperienceReservationAttendeeId'], {
      name: 'idx_attendee_answers_attendee_id',
    });

    await queryInterface.createTable('ExperienceReservationAnswers', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      questionKey: { type: Sequelize.STRING, allowNull: false },
      answerText: { type: Sequelize.TEXT, allowNull: true },
      answerJson: { type: Sequelize.JSON, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
      ExperienceReservationId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'ExperienceReservations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
    });
    await queryInterface.addConstraint('ExperienceReservationAnswers', {
      fields: ['ExperienceReservationId', 'questionKey'],
      type: 'unique',
      name: 'unique_reservation_answer_per_question',
    });
    await queryInterface.addIndex('ExperienceReservationAnswers', ['ExperienceReservationId'], {
      name: 'idx_reservation_answers_reservation_id',
    });

    await queryInterface.createTable('Hotels', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      hotelCode: { type: Sequelize.INTEGER, allowNull: false, unique: true },
      title: { type: Sequelize.STRING, allowNull: false },
      subtitle: { type: Sequelize.TEXT, allowNull: true },
      price: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      ratings: { type: Sequelize.DECIMAL(2, 1), allowNull: true },
      city: { type: Sequelize.STRING(100), allowNull: false },
      images: { type: Sequelize.JSON, allowNull: true },
      benefits: { type: Sequelize.JSON, allowNull: true },
      comments: { type: Sequelize.JSON, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
      LocationId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Locations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      OrganizationId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Organizations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      UserId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
    });
    await queryInterface.addIndex('Hotels', ['city'], { name: 'idx_hotel_city' });
    await queryInterface.addIndex('Hotels', ['hotelCode'], { name: 'idx_hotel_code' });

    await queryInterface.createTable('HotelReservations', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      confirmationCode: { type: Sequelize.STRING, allowNull: false, unique: true },
      checkInDate: { type: Sequelize.DATEONLY, allowNull: false },
      checkOutDate: { type: Sequelize.DATEONLY, allowNull: false },
      numberOfGuests: { type: Sequelize.INTEGER, allowNull: false },
      numberOfRooms: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      totalPrice: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      status: {
        type: Sequelize.ENUM('pending', 'confirmed', 'checked-in', 'checked-out', 'cancelled'),
        allowNull: false,
        defaultValue: 'confirmed',
      },
      specialRequests: { type: Sequelize.TEXT, allowNull: true },
      guestNames: { type: Sequelize.JSON, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
      CustomerId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      HotelId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Hotels', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
    });

    await queryInterface.createTable('Comments', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      CommentableId: { type: Sequelize.INTEGER, allowNull: true },
      CommentableType: { type: Sequelize.STRING, allowNull: true },
      stars: { type: Sequelize.INTEGER, allowNull: true },
      title: { type: Sequelize.STRING, allowNull: true },
      repliesCount: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
      comment: { type: Sequelize.TEXT, allowNull: false },
      anonymity: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      repliesDisabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
      UserId: {
        type: Sequelize.INTEGER,
        allowNull: true,   // Preserve comments even if user is deleted
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      ParentId: {
        type: Sequelize.INTEGER,
        allowNull: true, //null when not a reply
        references: { model: 'Comments', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
    });

    
    await queryInterface.createTable('OrganizationInvites', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      OrganizationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Organizations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      invitedByUserId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      email: { type: Sequelize.STRING, allowNull: false },
      code: { type: Sequelize.STRING, allowNull: false },
      token: { type: Sequelize.STRING, allowNull: false, unique: true },
      role: { type: Sequelize.STRING, allowNull: false, defaultValue: 'member' },
      expiresAt: { type: Sequelize.DATE, allowNull: false },
      usedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('OrganizationInvites', ['code'], {
      name: 'idx_organization_invites_code',
    });
    await queryInterface.addIndex('OrganizationInvites', ['OrganizationId', 'email', 'usedAt'], {
      name: 'idx_organization_invites_org_email_used',
    });

    await queryInterface.createTable('ExperienceOrganizers', {
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
      ExperienceId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'Experiences', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      UserId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
    });

    await queryInterface.createTable('OrganizationMembers', {
      isAdmin: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
      OrganizationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'Organizations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      UserId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('EmailVerificationTokens');
    await queryInterface.dropTable('OrganizationMembers');
    await queryInterface.dropTable('ExperienceOrganizers');
    await queryInterface.dropTable('OrganizationInvites');
    await queryInterface.dropTable('Comments');
    await queryInterface.dropTable('HotelReservations');
    await queryInterface.dropTable('Hotels');
    await queryInterface.dropTable('ExperienceReservationAnswers');
    await queryInterface.dropTable('ExperienceReservationAttendeeAnswers');
    await queryInterface.dropTable('ExperienceReservationAttendees');
    await queryInterface.dropTable('ExperienceReservations');
    await queryInterface.dropTable('TicketTiers');
    await queryInterface.dropTable('ScheduledExperiences');
    await queryInterface.dropTable('Experiences');
    await queryInterface.dropTable('Organizers');
    await queryInterface.dropTable('Organizations');
    await queryInterface.dropTable('Locations');
    await queryInterface.dropTable('Users');
  },
};