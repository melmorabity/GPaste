/*
 *      This file is part of GPaste.
 *
 *      Copyright 2014 Marc-Antoine Perennou <Marc-Antoine@Perennou.com>
 *
 *      GPaste is free software: you can redistribute it and/or modify
 *      it under the terms of the GNU General Public License as published by
 *      the Free Software Foundation, either version 3 of the License, or
 *      (at your option) any later version.
 *
 *      GPaste is distributed in the hope that it will be useful,
 *      but WITHOUT ANY WARRANTY; without even the implied warranty of
 *      MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *      GNU General Public License for more details.
 *
 *      You should have received a copy of the GNU General Public License
 *      along with GPaste.  If not, see <http://www.gnu.org/licenses/>.
 */

#include "gpaste-password-item-private.h"

#include <glib/gi18n-lib.h>

struct _GPastePasswordItemPrivate
{
    gchar *name;
};

G_DEFINE_TYPE_WITH_PRIVATE (GPastePasswordItem, g_paste_password_item, G_PASTE_TYPE_TEXT_ITEM)

G_PASTE_VISIBLE const gchar *
g_paste_password_item_get_name (const GPastePasswordItem *self)
{
    g_return_val_if_fail (G_PASTE_IS_PASSWORD_ITEM (self), NULL);

    GPastePasswordItemPrivate *priv = g_paste_password_item_get_instance_private ((GPastePasswordItem *) self);

    return priv->name;
}

static const gchar *
g_paste_password_item_get_kind (const GPasteItem *self G_GNUC_UNUSED)
{
    return "Password";
}

static gboolean
g_paste_password_item_equals (const GPasteItem *self,
                              const GPasteItem *other)
{
    g_return_val_if_fail (G_PASTE_IS_PASSWORD_ITEM (self), FALSE);
    g_return_val_if_fail (G_PASTE_IS_ITEM (other), FALSE);

    /* Passwords are never considered equals */
    return FALSE;
}

static void
g_paste_password_item_finalize (GObject *object)
{
    GPastePasswordItemPrivate *priv = g_paste_password_item_get_instance_private (G_PASTE_PASSWORD_ITEM (object));

    g_free (priv->name);

    G_OBJECT_CLASS (g_paste_password_item_parent_class)->finalize (object);
}


static void
g_paste_password_item_class_init (GPastePasswordItemClass *klass)
{
    GPasteItemClass *item_class = G_PASTE_ITEM_CLASS (klass);

    item_class->get_kind = g_paste_password_item_get_kind;
    item_class->equals = g_paste_password_item_equals;

    G_OBJECT_CLASS (klass)->finalize = g_paste_password_item_finalize;
}

static void
g_paste_password_item_init (GPastePasswordItem *self G_GNUC_UNUSED)
{
}

/**
 * g_paste_password_item_new:
 * @name: (allow-none): the name used to identify the password
 * @password: the content of the desired #GPastePasswordItem
 *
 * Create a new instance of #GPastePasswordItem
 *
 * Returns: a newly allocated #GPastePasswordItem
 *          free it with g_object_unref
 */
G_PASTE_VISIBLE GPasteItem *
g_paste_password_item_new (const gchar *name,
                           const gchar *password)
{
    g_return_val_if_fail (password, NULL);
    g_return_val_if_fail (g_utf8_validate (password, -1, NULL), NULL);
    g_return_val_if_fail (!name || g_utf8_validate (name, -1, NULL), NULL);

    GPasteItem *self = g_paste_item_new (G_PASTE_TYPE_PASSWORD_ITEM, password);
    GPastePasswordItemPrivate *priv = g_paste_password_item_get_instance_private ((GPastePasswordItem *) self);

    if (!name)
        name = "******";

    /* override password value length */
    self->size = strlen (name);
    priv->name = g_strdup (name);

    // This is the prefix displayed in history to identify a password
    G_PASTE_CLEANUP_FREE gchar *full_display_string = g_strdup_printf ("[%s] %s ", _("Password"), name);

    g_paste_item_set_display_string (self, full_display_string);

    return self;
}