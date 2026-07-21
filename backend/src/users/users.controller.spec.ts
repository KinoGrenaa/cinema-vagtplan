import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

describe("UsersController", () => {
  let controller: UsersController;
  let usersService: {
    findAll: jest.Mock;
    findOwnProfile: jest.Mock;
    findOwnCinemaMemberships: jest.Mock;
    findManagedCinemaMemberships: jest.Mock;
    updateManagedCinemaMemberships: jest.Mock;
    createUser: jest.Mock;
    updateUser: jest.Mock;
    deleteUser: jest.Mock;
    reactivateUser: jest.Mock;
    updateOwnProfile: jest.Mock;
    updateTheme: jest.Mock;
  };

  beforeEach(() => {
    usersService = {
      findAll: jest.fn(),
      findOwnProfile: jest.fn(),
      findOwnCinemaMemberships: jest.fn(),
      findManagedCinemaMemberships: jest.fn(),
      updateManagedCinemaMemberships: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
      reactivateUser: jest.fn(),
      updateOwnProfile: jest.fn(),
      updateTheme: jest.fn(),
    };

    controller = new UsersController(usersService as unknown as UsersService);
  });

  it("passes a validated cinema filter to the service", () => {
    const currentUser = {
      sub: 1,
      email: "master@example.com",
      role: "MASTER" as const,
      cinemaId: null,
    };

    controller.getAllUsers({ user: currentUser }, "12");

    expect(usersService.findAll).toHaveBeenCalledWith(currentUser, 12);
  });

  it.each(["", "0", "-1", "1.5", "abc"])(
    "rejects invalid cinema filter %p",
    (cinemaId) => {
      expect(() =>
        controller.getAllUsers(
          {
            user: {
              sub: 1,
              email: "master@example.com",
              role: "MASTER",
              cinemaId: null,
            },
          },
          cinemaId,
        ),
      ).toThrow(BadRequestException);

      expect(usersService.findAll).not.toHaveBeenCalled();
    },
  );

  it.each(["", "0", "-2", "2.5", "abc"])(
    "rejects invalid user route ID %p",
    (id) => {
      expect(() => controller.getUserCinemaMemberships(id)).toThrow(
        BadRequestException,
      );

      expect(usersService.findManagedCinemaMemberships).not.toHaveBeenCalled();
    },
  );

  it("passes a validated user ID to an admin mutation", () => {
    const currentUser = {
      sub: 4,
      email: "admin@example.com",
      role: "ADMIN" as const,
      cinemaId: 3,
    };

    controller.deleteUser("27", {
      user: currentUser,
    });

    expect(usersService.deleteUser).toHaveBeenCalledWith(27, currentUser);
  });

  it("rejects a malformed own-profile route ID", () => {
    expect(() =>
      controller.updateOwnProfile(
        "not-an-id",
        { user: { sub: 8 } },
        { email: "employee@example.com" },
      ),
    ).toThrow(BadRequestException);

    expect(usersService.updateOwnProfile).not.toHaveBeenCalled();
  });

  it("rejects an invalid authenticated user ID", () => {
    expect(() =>
      controller.getOwnProfile({
        user: { sub: "invalid" },
      }),
    ).toThrow(ForbiddenException);

    expect(usersService.findOwnProfile).not.toHaveBeenCalled();
  });

  it("does not mutate the create-user request body", () => {
    const body = {
      email: "new@example.com",
      firstName: "Ny",
      lastName: "Bruger",
      role: "EMPLOYEE" as const,
      cinemaId: 99,
    };
    const currentUser = {
      sub: 4,
      email: "admin@example.com",
      role: "ADMIN" as const,
      cinemaId: 3,
    };

    controller.createUser(body as never, {
      user: currentUser,
    });

    expect(body.cinemaId).toBe(99);
    expect(usersService.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ cinemaId: 3 }),
      currentUser,
    );
  });
});
