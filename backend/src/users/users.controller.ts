import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { unlink } from "fs/promises";
import { diskStorage } from "multer";
import { basename, extname, join } from "path";
import { validateUploadedImageFile } from "../common/file-validation/image-file-signature";
import { JwtGuard } from "../auth/jwt/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserCinemaMembershipsDto } from "./dto/update-user-cinema-memberships.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

export type AuthUser = {
  sub?: number;
  id?: number;
  email: string;
  role: "MASTER" | "ADMIN" | "EMPLOYEE";
  cinemaId: number | null;
};

const profileImageExtensionByMime: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const allowedProfileImageExtensions = [".jpg", ".jpeg", ".png", ".webp"];

@Controller("users")
export class UsersController {
  constructor(private usersService: UsersService) {}

  private validateUserRoleAccess(currentUser: AuthUser, targetRole?: string) {
    if (currentUser.role !== "MASTER" && targetRole === "MASTER") {
      throw new ForbiddenException(
        "Kun master kan oprette eller tildele master-rolle",
      );
    }
  }

  private parseRequiredUserId(id: string) {
    const userId = Number(id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new BadRequestException("Bruger skal være et gyldigt ID");
    }

    return userId;
  }

  private getAuthenticatedUserId(req: any) {
    const userId = Number(req.user?.sub ?? req.user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new ForbiddenException("Brugeren kunne ikke identificeres");
    }

    return userId;
  }

  private parseOptionalCinemaId(cinemaId?: string) {
    if (cinemaId === undefined) {
      return undefined;
    }

    const parsedCinemaId = Number(cinemaId);

    if (!Number.isInteger(parsedCinemaId) || parsedCinemaId <= 0) {
      throw new BadRequestException("Biograf skal være et gyldigt ID");
    }

    return parsedCinemaId;
  }

  private async removeManagedProfileImage(imageUrl?: string | null) {
    const prefix = "/uploads/profile-images/";
    if (!imageUrl?.startsWith(prefix)) {
      return;
    }

    const fileName = basename(imageUrl.slice(prefix.length));
    if (!fileName) {
      return;
    }

    try {
      await unlink(join(process.cwd(), "uploads", "profile-images", fileName));
    } catch {
      // File cleanup must not turn an otherwise valid request into an error.
    }
  }

  @UseGuards(JwtGuard)
  @Get()
  getAllUsers(@Req() req: any, @Query("cinemaId") cinemaId?: string) {
    const currentUser = req.user as AuthUser;
    const selectedCinemaId = this.parseOptionalCinemaId(cinemaId);

    return this.usersService.findAll(currentUser, selectedCinemaId);
  }

  @UseGuards(JwtGuard)
  @Get("me/profile")
  getOwnProfile(@Req() req: any) {
    return this.usersService.findOwnProfile(this.getAuthenticatedUserId(req));
  }

  @UseGuards(JwtGuard)
  @Get("me/cinema-memberships")
  getOwnCinemaMemberships(@Req() req: any) {
    return this.usersService.findOwnCinemaMemberships(
      this.getAuthenticatedUserId(req),
    );
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles("MASTER")
  @Get(":id/cinema-memberships")
  getUserCinemaMemberships(@Param("id") id: string) {
    return this.usersService.findManagedCinemaMemberships(
      this.parseRequiredUserId(id),
    );
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles("MASTER")
  @Patch(":id/cinema-memberships")
  updateUserCinemaMemberships(
    @Param("id") id: string,
    @Body() body: UpdateUserCinemaMembershipsDto,
    @Req() req: any,
  ) {
    return this.usersService.updateManagedCinemaMemberships(
      this.parseRequiredUserId(id),
      body.cinemaIds,
      req.user as AuthUser,
    );
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN", "MASTER")
  @Post()
  createUser(@Body() body: CreateUserDto, @Req() req: any) {
    const currentUser = req.user as AuthUser;
    this.validateUserRoleAccess(currentUser, body.role);

    if (currentUser.role === "MASTER") {
      return this.usersService.createUser(body, currentUser);
    }

    if (!currentUser.cinemaId) {
      throw new ForbiddenException("Din bruger er ikke tilknyttet en biograf");
    }

    return this.usersService.createUser(
      {
        ...body,
        cinemaId: currentUser.cinemaId,
      },
      currentUser,
    );
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN", "MASTER")
  @Patch(":id")
  updateUser(
    @Param("id") id: string,
    @Body() body: UpdateUserDto,
    @Req() req: any,
  ) {
    const currentUser = req.user as AuthUser;
    this.validateUserRoleAccess(currentUser, body.role);

    return this.usersService.updateUser(
      this.parseRequiredUserId(id),
      body,
      currentUser,
    );
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN", "MASTER")
  @Delete(":id")
  deleteUser(@Param("id") id: string, @Req() req: any) {
    const currentUser = req.user as AuthUser;

    return this.usersService.deleteUser(
      this.parseRequiredUserId(id),
      currentUser,
    );
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN", "MASTER")
  @Patch(":id/reactivate")
  reactivateUser(@Param("id") id: string, @Req() req: any) {
    const currentUser = req.user as AuthUser;

    return this.usersService.reactivateUser(
      this.parseRequiredUserId(id),
      currentUser,
    );
  }

  @UseGuards(JwtGuard)
  @Patch(":id/profile")
  updateOwnProfile(
    @Param("id") id: string,
    @Req() req: any,
    @Body()
    body: {
      email: string;
      phone?: string;
      password?: string;
      address?: string;
      birthDate?: string | null;
      emergencyPhone?: string;
      skills?: string;
    },
  ) {
    const userId = this.parseRequiredUserId(id);
    const currentUserId = this.getAuthenticatedUserId(req);

    if (currentUserId !== userId) {
      throw new ForbiddenException("Du kan kun redigere din egen profil");
    }

    const {
      email,
      phone,
      password,
      address,
      birthDate,
      emergencyPhone,
      skills,
    } = body;

    return this.usersService.updateOwnProfile(userId, {
      email,
      phone,
      password,
      address,
      birthDate,
      emergencyPhone,
      skills,
    });
  }

  @UseGuards(JwtGuard)
  @Post(":id/profile-image")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./uploads/profile-images",
        filename: (_, file, callback) => {
          const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);

          const extension = profileImageExtensionByMime[file.mimetype];

          if (!extension) {
            return callback(
              new BadRequestException("Kun JPG, PNG og WEBP er tilladt"),
              "",
            );
          }

          callback(null, `${uniqueName}${extension}`);
        },
      }),
      limits: {
        fileSize: 2 * 1024 * 1024,
      },
      fileFilter: (_, file, callback) => {
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

        const extension = extname(file.originalname).toLowerCase();

        if (
          !allowedTypes.includes(file.mimetype) ||
          !allowedProfileImageExtensions.includes(extension)
        ) {
          return callback(
            new BadRequestException("Kun JPG, PNG og WEBP er tilladt"),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  async uploadProfileImage(
    @Param("id") id: string,
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const imageUrl = file ? `/uploads/profile-images/${file.filename}` : null;
    let currentProfile;

    try {
      const userId = this.parseRequiredUserId(id);
      const currentUserId = this.getAuthenticatedUserId(req);

      if (currentUserId !== userId) {
        throw new ForbiddenException(
          "Du kan kun uploade billede til din egen profil",
        );
      }

      if (!file || !imageUrl) {
        throw new BadRequestException("Ingen fil uploadet");
      }

      await validateUploadedImageFile(file);

      currentProfile = await this.usersService.findOwnProfile(userId);

      await this.usersService.updateOwnProfile(userId, {
        profileImage: imageUrl,
      });
    } catch (error) {
      await this.removeManagedProfileImage(imageUrl);
      throw error;
    }

    if (currentProfile.profileImage !== imageUrl) {
      await this.removeManagedProfileImage(currentProfile.profileImage);
    }

    return { imageUrl };
  }

  @UseGuards(JwtGuard)
  @Patch(":id/theme")
  updateTheme(
    @Param("id") id: string,
    @Req() req: any,
    @Body() body: { theme: string },
  ) {
    const userId = this.parseRequiredUserId(id);
    const currentUserId = this.getAuthenticatedUserId(req);

    if (currentUserId !== userId) {
      throw new ForbiddenException("Du kan kun ændre tema for din egen bruger");
    }

    return this.usersService.updateTheme(userId, body.theme);
  }
}
