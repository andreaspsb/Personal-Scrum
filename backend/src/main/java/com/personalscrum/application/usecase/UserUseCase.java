package com.personalscrum.application.usecase;

import com.personalscrum.application.dto.UpdateUserRoleRequest;
import com.personalscrum.application.dto.UserDTO;
import com.personalscrum.domain.entity.User;
import com.personalscrum.domain.repository.UserRepository;
import com.personalscrum.web.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserUseCase {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<UserDTO> getAllUsers() {
        return userRepository.findAll().stream()
                .map(user -> new UserDTO(user.getId(), user.getName(), user.getEmail(), user.getRole()))
                .collect(Collectors.toList());
    }

    @Transactional
    public UserDTO updateUserRole(Long id, UpdateUserRoleRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id " + id));

        // Prefix custom roles with ROLE_ if not present, though usually convention based.
        String newRole = request.role().toUpperCase();
        if (!newRole.startsWith("ROLE_")) {
            newRole = "ROLE_" + newRole;
        }

        user.setRole(newRole);
        userRepository.save(user);

        return new UserDTO(user.getId(), user.getName(), user.getEmail(), user.getRole());
    }

    @Transactional
    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new ResourceNotFoundException("User not found with id " + id);
        }
        userRepository.deleteById(id);
    }
}
